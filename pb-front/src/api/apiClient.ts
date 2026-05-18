import { ErrorResultResponse } from "@/types/ErrorResponse";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const apiClient = axios.create({
    baseURL: "/api",
    withCredentials: true,
});

// 요청 인터셉터는 제거합니다.
// 백엔드에서 'HttpOnly'로 쿠키를 설정했기 때문에 클라이언트 스크립트(js-cookie)에서 토큰을 읽을 수 없습니다.
// 대신 브라우저가 'withCredentials: true' 옵션에 따라 자동으로 인증 쿠키를 모든 요청에 담아 보냅니다.
// 백엔드의 user.controller.ts는 req.cookies.authorization을 확인하므로 이 방식이 올바르게 동작합니다.

// 동시에 여러 요청이 401을 받아도 token-check는 한 번만 호출하기 위한 상태
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown) {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
        } else {
            resolve(undefined);
        }
    });
    failedQueue = [];
}

// 에러 핸들링: 401이면 accessToken 재발급 후 재요청
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean
        }

        if (error.response?.status !== 401 || originalRequest._retry) {
            // 401 이외의 에러(400, 409, 500 등)는 React Query의 onError로 가도록 그대로 던져줍니다!
            return Promise.reject(error);
        }

        // 이미 refresh 중이면 큐에 쌓아두고 대기
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then(() => apiClient(originalRequest))
                .catch(() => Promise.reject(error));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            await axios.post(
                `/api/auth/token-check`,
                null,
                { withCredentials: true }
            );

            // 재발급 성공 → 대기 중인 요청 모두 재시도
            processQueue(null);
            return apiClient(originalRequest);
        } catch (refreshErr) {
            processQueue(refreshErr);

            const refreshError = refreshErr as AxiosError<ErrorResultResponse>;
            const message = refreshError.response?.data?.resultMessage;
            if (message === '만료된 JWT 토큰입니다.' || message?.startsWith('Refresh')) {
                window.location.href = '/auth/login';
            }

            return Promise.reject(error);
        } finally {
            isRefreshing = false;
        }
    }
)