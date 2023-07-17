
  <!-- <img src="https://user-images.githubusercontent.com/117638456/253851018-d8aa8a49-3824-46c9-a2fa-05d1a460e52c.png" width="200" height="400"/> -->

<h1> disc-doctor </h1>

- 좋은 자세를 취하도록 도와주어 디스크로 인한 통증을 호전시켜주는 알람 앱

<br/>

<h2> 1. 설계 & 디자인  </h2>
<h4> - HTML, CSS, Javascript, React </h4>

<li> vew 를 쓰지 않은 이유 </li> 
<br/>


<h2> 2. 프로젝트 세팅  </h2> 
<h4> - Vite </h4> 
<br/>


<h2> 3. 배포  </h2>
<h4> - Firebase Hosting , Github Page </h4> 
<br/>


<h2> 4. 기능  </h2> 
<h4> 4-1. 가입, 로그인, 로그아웃  </h4> 
   - Firebase Authentication사용
<br/>

<h4> 4-2. CRUD에 사용되는 데이터베이스  </h4>    
    - Firestore Database 사용<br/>
      (Firestore를 사용하기 전에는 mock API, axios를 사용했습니다.) <br/><br/>
      
      

      
<h2> 5. 스플래시 이미지  </h2> 
<h4> -  첫 진입시에만 볼 수 있게 기능 구현.  웹 페이지가 꺼졌을 때는 데이터를 삭제하고, 웹이 다시 켜졌을 때 볼 수 있도록 sessionstorage 를 사용했습니다. </h4> 
<br/>


<h2> 6. 유저 아이디 표시, 회원가입, 로그인  </h2> 
<h4> - Context API로 전역상태로 처리했습니다. </h4> 
<br/>

<h2> 7. 여러 애니메이션  </h2> 
<h4>  - 리액트 라우터 구조(중첩 라우터, 조건부 렌더링)로 설계했습니다. </h4> 
<br/>

<h2> 8. 로고 및 스플래시 이미지  </h2> 
<h4>  외주 </h4> 
<br/>


<h2> 9. 최적화  </h2> 
<h4>   - Lazy Loading </h4> 
<h4>   - vite로 빌드  </h4> 
<br/>


 <h2> 10. 배포 링크  </h2> 
 <h4>   - https://disk-doctor-8c3fc.web.app </h4> 
   


<br/><br/>

  <h2> 11. 기술적 의사결정  </h2> 

  <h3> 기본적으로 의사결정의 기준은 속도와 빠른 업데이트였습니다. 제가 원하는것은 빠르게 개발하고 테스트하는 것이었기에 속도에 중요성을 두고 의사결정을 내렸습니다.  </h3> 
  
 <h4>  JavaScript </h4> 
<ul>
   <li> 장점
   <ul>  
     <li> 간단하고 빠르게 개발 가능</li>
   </ul>  
</li>
</ul>  

<ul>
   <li> 단점
   <ul>  
     <li> 타입관리가 어려워 오류가 발생이 쉽다</li>
     <li> 디버깅에 많은 시간을 투자해야 한다</li>
   </ul>  
</li>
</ul>  

 <h4>  TypeScript </h4> 
<ul>
   <li> 장점
   <ul>  
     <li> 강타입의 언어로 컴파일 단계에서 타입에러를 발견할 수 있다</li>
   </ul>  
</li>
</ul>  

<ul>
   <li> 단점
   <ul>  
     <li> JavaScript에 비해 개발 속도가 느리다</li>     
   </ul>  
</li>
</ul>  





<br>
 <!-- 1. node.js
 2. npm create vite 
 3. npm i react-router-dom 
 4. npm install react-icons -->
