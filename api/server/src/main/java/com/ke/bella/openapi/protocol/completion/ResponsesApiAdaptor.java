package com.ke.bella.openapi.protocol.completion;

import com.ke.bella.openapi.EndpointContext;
import com.ke.bella.openapi.protocol.Callbacks;
import com.ke.bella.openapi.utils.DateTimeUtils;
import com.ke.bella.openapi.utils.HttpUtils;
import com.ke.bella.openapi.utils.JacksonUtils;
import lombok.extern.slf4j.Slf4j;
import okhttp3.MediaType;
import okhttp3.Request;
import okhttp3.RequestBody;
import org.apache.commons.collections4.MapUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

/**
 * OpenAI Responses API Adapter
 * 使用 store=false 和 previous_response_id 为空的 responses api 模拟 chat completion 功能
 */
@Component("ResponsesApiAdaptor")
@Slf4j
public class ResponsesApiAdaptor implements CompletionAdaptor<ResponsesApiProperty> {
    private static final String HUOSHAN_SUPPLIER = "huoshan";
    private static final String HUOSHAN_ARK_SUPPLIER = "火山方舟";
    private static final String WEB_SEARCH_TOOL_TYPE = "web_search";

    @Override
    public String getDescription() {
        return "OpenAI Responses API协议";
    }

    @Override
    public Class<ResponsesApiProperty> getPropertyClass() {
        return ResponsesApiProperty.class;
    }

    @Override
    public CompletionResponse completion(CompletionRequest request, String url, ResponsesApiProperty property) {
        // 转换请求格式
        ResponsesApiRequest responsesRequest = ResponsesApiConverter.convertChatCompletionToResponses(request,
                EndpointContext.getProcessData().getAkCode(), property);
        patchHuoshanWebSearchTools(request, responsesRequest);

        // 构建HTTP请求
        Request httpRequest = buildResponsesApiRequest(responsesRequest, url, property);
        clearLargeData(request, responsesRequest);
        // 发送请求并获取Responses API响应
        ResponsesApiResponse responsesResponse = HttpUtils.httpRequest(httpRequest, ResponsesApiResponse.class,
                (errorResponse, res) -> {
                    if(errorResponse.getError() != null) {
                        errorResponse.getError().setHttpCode(res.code());
                    }
                });
        // 转换为Chat Completion格式
        CompletionResponse response = ResponsesApiConverter.convertResponsesToChatCompletion(responsesResponse);
        response.setCreated(DateTimeUtils.getCurrentSeconds());

        return response;
    }

    @Override
    public void streamCompletion(CompletionRequest request, String url, ResponsesApiProperty property,
            Callbacks.StreamCompletionCallback callback) {
        // 转换请求格式
        ResponsesApiRequest responsesRequest = ResponsesApiConverter.convertChatCompletionToResponses(request,
                EndpointContext.getProcessData().getAkCode(), property);
        patchHuoshanWebSearchTools(request, responsesRequest);
        responsesRequest.setStream(true);  // 确保启用流式

        // 创建 SSE 转换器和监听器
        ResponsesApiSseConverter sseConverter = new ResponsesApiSseConverter();
        CompletionSseListener listener = new CompletionSseListener(callback, sseConverter);

        Request httpRequest = buildResponsesApiRequest(responsesRequest, url, property);
        clearLargeData(request, responsesRequest);
        // 发送流式请求
        HttpUtils.streamRequest(httpRequest, listener);
    }

    private void patchHuoshanWebSearchTools(CompletionRequest request, ResponsesApiRequest responsesRequest) {
        if(!isHuoshanRequest() || request == null || request.getTools() == null || responsesRequest.getTools() == null) {
            return;
        }
        if(request.getTools().size() != responsesRequest.getTools().size()) {
            return;
        }

        for (int i = 0; i < request.getTools().size(); i++) {
            Message.Tool sourceTool = request.getTools().get(i);
            ResponsesApiRequest.ResponsesApiTool targetTool = responsesRequest.getTools().get(i);
            if(!shouldConvertToHuoshanWebSearch(sourceTool)) {
                continue;
            }
            targetTool.setType(WEB_SEARCH_TOOL_TYPE);
            targetTool.setName(null);
            targetTool.setDescription(null);
            targetTool.setParameters(null);
            targetTool.setStrict(null);
            if(MapUtils.isNotEmpty(sourceTool.getExtraBody())) {
                sourceTool.getExtraBody().forEach(targetTool::setExtraBodyField);
            }
        }
    }

    private boolean isHuoshanRequest() {
        String supplier = EndpointContext.getProcessData().getSupplier();
        return StringUtils.equalsIgnoreCase(HUOSHAN_SUPPLIER, supplier)
                || StringUtils.equals(HUOSHAN_ARK_SUPPLIER, supplier);
    }

    private boolean shouldConvertToHuoshanWebSearch(Message.Tool tool) {
        if(tool == null) {
            return false;
        }
        if(StringUtils.equals(tool.getType(), WEB_SEARCH_TOOL_TYPE)) {
            return true;
        }
        return StringUtils.equals(tool.getType(), "function")
                && tool.getFunction() != null
                && StringUtils.equals(tool.getFunction().getName(), WEB_SEARCH_TOOL_TYPE);
    }

    /**
     * 构建 Responses API HTTP 请求
     */
    private Request buildResponsesApiRequest(ResponsesApiRequest request, String url, ResponsesApiProperty property) {
        // 设置部署模型名称
        request.setModel(property.getDeployName());

        // 确保 store=false 和 previous_response_id=null (用于模拟 chat completion)
        request.setStore(false);
        request.setPrevious_response_id(null);

        // 添加API版本
        if(StringUtils.isNotEmpty(property.getApiVersion())) {
            url += property.getApiVersion();
        }

        // 构建请求
        Request.Builder builder = authorizationRequestBuilder(property.getAuth())
                .url(url)
                .post(RequestBody.create(MediaType.parse("application/json"), JacksonUtils.toByte(request)));

        // 添加额外的请求头
        if(MapUtils.isNotEmpty(property.getExtraHeaders())) {
            property.getExtraHeaders().forEach(builder::addHeader);
        }

        return builder.build();
    }

}
