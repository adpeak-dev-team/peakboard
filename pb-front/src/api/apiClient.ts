import axios from "axios";

export const apiClient = axios.create({
    baseURL: "/api",
    withCredentials: true,
});

// 인증 쿠키는 HttpOnly 라 JS 에서 못 읽지만, withCredentials: true 로
// 브라우저가 모든 요청에 세션 쿠키를 자동 첨부한다.

// 401(미인증) 응답은 각 호출부에서 처리한다. 로그인 기능이 붙기 전까지는
// 전역 리다이렉트를 걸지 않아 비로그인 상태로도 메인 페이지에 진입 가능.
apiClient.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
);
