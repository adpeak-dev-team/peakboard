import axios from "axios";

export const apiClient = axios.create({
    baseURL: "/api",
    withCredentials: true,
});

// 인증 쿠키는 HttpOnly 라 JS 에서 못 읽지만, withCredentials: true 로
// 브라우저가 모든 요청에 세션 쿠키를 자동 첨부한다.

// 401(미인증) 응답이면 로그인 페이지로 이동. (이미 인증 페이지면 루프 방지로 제외)
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        if (
            status === 401 &&
            typeof window !== "undefined" &&
            !window.location.pathname.startsWith("/auth")
        ) {
            window.location.href = "/auth/login";
        }
        return Promise.reject(error);
    }
);
