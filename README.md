# BangGuseokTV 백앤드
방구석 TV 프로젝트에서 사용하는 서버입니다.  
클라이언트와의 통신을 통한 인증, 자원관리, 대기열 알고리즘 등을 구현하였습니다.

## 시스템 구성도
![시스템구조2 (1)](https://user-images.githubusercontent.com/37526782/101884498-22587b00-3bdc-11eb-8d8b-725feee780b9.png)

## 사용한 기술
+ Node.js
+ Koa
+ MongoDB
+ Mongoose
+ jsonwebtoken
+ passport
+ Socket.io

## Web Site
![스크린샷](https://user-images.githubusercontent.com/37526782/101886780-4ec1c680-3bdf-11eb-9b47-23bf29b83ec3.JPG)

+ 사이트 주소 : https://bangguseoktv.web.app/

## 기능
### API 서버
+ ./api/auth  : 로그인 / 로그아웃, 이메일인증, 토큰체크 와 같은 인증관련 API 입니다.
+ ./api/rooms : 유저의 방에 대한 CRUD 입니다.
+ ./api/users : 유저의 계정에 대한 CRUD 입니다.

### Socket.io 실시간 양방향 통신
+ 채팅 메세지 관련 이벤트를 작성하였습니다.
+ 실시간으로 유저 정보를 업데이트합니다. (대기열, 친구목록)

### 토큰 인증 방식
+ JWT 기반의 인증방식을 사용하였습니다.
+ Cookie 설정을 통해 토큰을 전달합니다.

### 대기열
+ 대기열에 유저가 존재할 시 계속해서 대기열이 돌아가도록 재귀적으로 setTimeout() 을 호출하는 방식으로 구현했습니다.
+ 순서가 있는 데이터이므로 Map 및 Array 등의 자료구조를 사용하였습니다.
