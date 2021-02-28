# BangGuseokTV_backend
방구석 TV 프로젝트의 백엔드 서버를 개발 및 배포하기 위한 프로젝트입니다.

HTTP통신 및 소켓통신을 통해 클라이언트와 상호작용하며  
토큰인증시스템 및 대기열을 관리하는 모듈들을 구현한 서버입니다.  

# <br>개발환경
+ 운영체제 : windows 10
+ Editor : Visual Studio Code 1.53.2
+ 개발언어 : JavaScript (ES6+)
+ 호스팅 : Heroku

# <br>사용기술
## JavaScript (ES6+)
+ 프론트엔드와 백엔드를 한가지 언어로 작업하기 위해 사용했습니다.
+ Arrow, let, const, map, async/await 등의 문법을 사용했습니다.

## Node.js, Koa
+ Javascript를 사용할 수 있고 웹 프레임워크인 Koa를 통해 웹서버로서 동작이 가능하기 때문에 Node.js를 사용했습니다.  
+ Express보다 경량화되고 try-catch 에러처리 없이 async/await를 사용할 수 있는 Koa를 사용했습니다.

## MongoDB, Mongoose
+ Node.js와의 궁합이 좋고 JSON 형태의 데이터를 사용하기 위해 MongoDB를 사용했고 클라우드 서비스인 Atlas 사용했습니다.
+ MongoDB의 널리 알려진 ODM인 Mongoose를 사용했습니다.

# <br>시스템 구성도
![시스템구조4](https://user-images.githubusercontent.com/37526782/109167228-e12a3d00-77c0-11eb-87a9-810a2cb78690.png)  
서버사이드렌더링(SSR)이 아닌 클라이언트사이드렌더링(CSR) 방식의 SPA를 구성했습니다.  
클라이언트와 서버의 통신을 위해 HTTP통신과 Socket통신을 사용하였으며 모든 데이터는 JSON 형태로 전달이 되도록 구성했습니다.


# <br>Web Site
## 구현기능
![사이트기능](https://user-images.githubusercontent.com/37526782/109170871-872b7680-77c4-11eb-8285-8bb896cb796f.PNG)

## 브라우저 지원
![브라우저 호환](https://user-images.githubusercontent.com/37526782/107678316-94356980-6cde-11eb-9cbb-d9102d698434.PNG)

## 웹사이트 주소
https://bangguseoktv.web.app/

# <br>디렉토리 구조
백엔드의 주요 디렉토리 구조는 아래와 같습니다.

```
.
└── src/
    ├── api/
    |   ├── auth/
    |   |   ├── auth.controller.js
    |   |   └── index.js
    |   ├── rooms/
    |   |   ├── rooms.controller.js
    |   |   └── index.js
    |   ├── users/
    |   |   ├── users.controller.js
    |   |   └── index.js
    |   └── index.js
    ├── lib/
    |   ├── passport.js
    |   ├── playerlist.js
    |   ├── socket.js
    |   ├── token.js
    |   └── upload.js
    ├── models/
    |   ├── account.js
    |   └── room.js
    └── index.js
```

## api/
유저인증 및 자원의 CRUD에 대한 API들을 라우팅 모듈화하였습니다.  
각 폴더마다 라우트와 컨트롤러 코드로 분할하여 index.js 파일은 라우팅, .controller.js 파일은 콜백함수 부분으로 나누었습니다.
### auth.controller.js
로컬 회원가입, 로컬 로그인, 이메일/아이디 존재유무 확인, 로그아웃,  
유저정보체크, 이메일인증, 구글/페이스북 로그인 등의 인증관련 API입니다.
### rooms.controller.js
방 목록, 방 이미지, 방 설명에 대한 REST API를 구현했습니다.
### users.controller.js
유저의 이름, 아바타, 재생목록, 친구목록에 대한 REST API를 구현했습니다.

## lib/
서버의 주요 기능들을 모듈화한 파일들이 있습니다.
### passport.js 
방구석TV의 계정인증을 대행하기 위해 OAuth 2.0 인증방식을 사용하는 방법을 선택했습니다.  
이를 위해 passport 모듈을 사용하여 구글와 페이스북 로그인의 Strategy를 설정했습니다.
### playerlist.js
대기열이 작동하기 위한 객체와 함수를 정의했습니다.  
Map 객체를 활용하여 모든 방에 대한 정보를 담았고, Array 객체를 사용하여 대기열을 구현하였습니다.  
동영상 재생시간에 따라 대기열을 순환시키기 위해서 setTimeout()을 사용했고, 이를 재귀적으로 호출하는 방식을 사용했습니다.
### socket.js
실시간으로 대기열 및 유저 정보의 변경사항을 클라이언트로 전달하기 위한 이벤트 리스너를 정의했습니다.  
이를 위해 대기열 모듈을 가져와서 사용하고 있으며 io변수를 전달받아서 이벤트를 연결합니다.  
주요 이벤트로는 방 입장/퇴장, 채팅메시지, 친구요청 관련 통신, 대기열 참가/나가기, 소켓 연결/해제 시 다른유저의 친구목록 갱신 등이 있습니다.
### token.js
jsonwebtoken 모듈을 사용하여 토큰을 생성하고 검증하는 함수들과 요청 메시지의 Access Token을 검증하는 미들웨어를 정의했습니다.  
토큰의 유효시간은 짧게 1시간으로 설정하였으며 토큰을 쿠키에 저장할 때 httpOnly와 SameSite 설정을 통해 쿠키가 안전하게 전달되도록 하였습니다.  

## models/
Mongoose 를 사용하여 스키마와 메소드를 정의하고 이를 모델로 변환합니다.  
또한 static 메소드와 instance 메소드를 통해 자주 사용하는 메소드들을 정의했습니다.
### account.js
유저의 계정에 대한 데이터베이스 스키마와 메소드를 정의했습니다.
### room.js
방에 대한 데이터베이스 스키마와 메소드를 정의했습니다.
