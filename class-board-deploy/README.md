# 학급 게시판 + 급식표 배포 가이드

미리보기(아티팩트)에서는 보안 정책 때문에 나이스 API 실시간 호출이 막혀 있어요.
그래서 이 프로젝트는 **GitHub Actions가 매일 자동으로 급식 데이터를 미리 받아와서
JSON 파일로 저장**하고, 사이트는 그 파일을 읽기만 하는 방식으로 만들었어요.
같은 서버 안에서 파일을 읽는 거라 CORS 문제도 없어요.

게시판은 **Firebase(Firestore)**라는 무료 데이터베이스를 씁니다.

---

## 1. GitHub 저장소 만들기

1. github.com 접속 → 로그인 (계정 없으면 가입)
2. 오른쪽 위 `+` → `New repository`
3. Repository name: `class-board` (원하는 이름) → Public 선택 → `Create repository`

## 2. 파일 업로드

1. 방금 만든 저장소 페이지에서 `Add file` → `Upload files`
2. 이 대화에서 받은 파일들을 **폴더 구조 그대로** 끌어다 놓기
   - `index.html`, `style.css`, `app.js`, `firebase-config.js`
   - `.github/workflows/update-meal.yml` (이 폴더 경로가 중요해요! 그대로 유지)
3. `Commit changes` 클릭

> 웹 업로드로 숨김폴더(`.github`)가 잘 안 올라가면, 저장소 페이지에서
> `Add file` → `Create new file` → 파일명 칸에 `.github/workflows/update-meal.yml`
> 이라고 직접 입력하면 폴더가 자동으로 만들어져요. 내용은 붙여넣기 하면 됩니다.

## 3. GitHub Pages 켜기 (사이트 주소 만들기)

1. 저장소 → `Settings` → 왼쪽 메뉴 `Pages`
2. `Branch`를 `main` / `/ (root)`로 설정 → `Save`
3. 1~2분 후 페이지 상단에 뜨는 주소 (`https://아이디.github.io/class-board/`)로 접속하면 사이트가 보여요

## 4. 급식 데이터 최초 1회 수동 실행

1. 저장소 → `Actions` 탭 → 왼쪽 `Update Meal Data` 클릭
2. 오른쪽 `Run workflow` 버튼 → `Run workflow` 확인
3. 1분 정도 후 저장소에 `meal-data/meal_202608.json` 같은 파일이 자동 생성돼요
4. 이후로는 **매일 새벽 2시(KST)에 자동으로 갱신**돼요 (나이스에 새 급식표가 올라오면 다음날 자동 반영)

## 5. Firebase로 게시판 연결하기

1. console.firebase.google.com 접속 → 로그인 → `프로젝트 추가`
2. 프로젝트 이름 입력 (예: class-board) → 계속 진행 (애널리틱스는 꺼도 됨)
3. 왼쪽 메뉴 `Firestore Database` → `데이터베이스 만들기` → **테스트 모드로 시작** → 위치는 `asia-northeast3 (서울)` 추천
4. 왼쪽 위 톱니바퀴 `프로젝트 설정` → 아래로 스크롤 → `</>` (웹 앱 추가) 아이콘 클릭 → 앱 닉네임 아무거나 입력 → 앱 등록
5. 화면에 나오는 `firebaseConfig` 값을 통째로 복사
6. GitHub 저장소의 `firebase-config.js` 파일을 열어서 `여기에_...` 부분을 방금 복사한 값으로 교체 → 저장(commit)

### 보안 규칙 (30일 뒤 만료 주의)

테스트 모드는 30일 후 자동으로 잠깁니다. 계속 쓰려면 Firestore → `규칙` 탭에서 아래처럼 바꿔주세요
(학급 게시판이라 크게 민감하지 않다면 아래 정도면 충분해요):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> 참고: 비밀번호로 선생님 화면을 잠그긴 하지만, 이건 화면만 가리는 정도이고
> 데이터베이스 자체는 링크만 알면 누구나 쓸 수 있는 구조예요. 학급 내부용으로
> 가볍게 쓰기엔 충분하지만, 진짜 민감한 정보는 올리지 않는 걸 추천해요.

## 6. 완료!

이제 `https://아이디.github.io/class-board/` 주소를 반 친구들에게 공유하면 돼요.
선생님은 화면 오른쪽 위 `선생님` 버튼 → 기본 비밀번호 `1234`로 입장 →
설정 탭에서 비밀번호와 학급 이름을 바꿀 수 있어요.

## 다른 학교로 바꾸고 싶다면

`.github/workflows/update-meal.yml` 파일의 `OFFICE_CODE`, `SCHOOL_CODE` 값을
원하는 학교 것으로 바꾸고, `app.js` 맨 위 `OFFICE_CODE`, `SCHOOL_CODE`도 똑같이 바꿔주세요.
코드는 나이스 교육정보 개방 포털(open.neis.go.kr)에서 학교 이름으로 검색하면 확인할 수 있어요.
