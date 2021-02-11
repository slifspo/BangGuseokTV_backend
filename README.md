# 설명
방구석 TV 프로젝트의 백엔드 서버를 개발 및 배포하기 위한 Repository입니다.

# Web Site
### Preview
![스크린샷](https://user-images.githubusercontent.com/37526782/101886780-4ec1c680-3bdf-11eb-9b47-23bf29b83ec3.JPG)

### 브라우저 지원
![브라우저 호환](https://user-images.githubusercontent.com/37526782/107678316-94356980-6cde-11eb-9cbb-d9102d698434.PNG)

### 웹사이트 주소
https://bangguseoktv.web.app/

# 시스템 구성도
![시스템구조3-3](https://user-images.githubusercontent.com/37526782/107567727-65a98700-6c29-11eb-981c-08d909078315.png)

# 개발환경
+ OS : Windows 10
+ Editor : VSCode

# 사용 기술
+ Node.js (Koa 프레임워크)
+ MongoDB (mongoose)

# 폴더 설명
+ /api : auth, rooms, users의 API
+ /lib : Passport, 대기열, socket.io, JWT, 이미지업로드 관련 모듈
+ /models : 유저의 계정, 방에 대한 데이터베이스 스키마 및 메소드 정의

# 구현 내용
### API 서버
+ auth  : 로그인 / 로그아웃, 이메일인증, 토큰체크와 같은 인증관련 API 입니다.
+ rooms : 유저의 방에 대한 REST API 입니다.
+ users : 유저의 계정에 대한 REST API 입니다.

### Socket.io 실시간 양방향 통신
+ 채팅 메세지 관련 이벤트를 작성하였습니다.
+ 실시간으로 대기열 및 유저 정보의 변경사랑을 클라이언트로 전달합니다.

### 토큰기반인증
+ jsonwebtoken 라이브러리를 사용하여 토큰생성 및 검증을 수행합니다.
+ JWT 처리 미들웨어를 두어서 클라이언트 요청 시 토큰의 유효성을 검증합니다.
+ Access Token을 Cookie에 저장하는 방식을 사용합니다.

### 대기열
+ 대기열에 유저가 존재할 시 계속해서 대기열이 돌아갈 수 있도록 재귀적으로 setTimeout() 을 호출하는 방식으로 구현했습니다.
+ 추가/삭제가 빈번하고 동적인 크기를 가지는 데이터이므로 Map 및 Array 등의 자료구조를 사용하였습니다.

### SNS 로그인
+ Passport를 사용하여 OAuth 2.0 인증을 통한 간편한 SNS 로그인을 구현
