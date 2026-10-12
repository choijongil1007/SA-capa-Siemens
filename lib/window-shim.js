// public/assets/items.js 는 브라우저용(window.*)이라, 서버에서 불러오기 전에 window 를 만들어 둡니다.
globalThis.window = globalThis;
