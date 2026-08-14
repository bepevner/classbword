// ===== 학교 코드 (급식표용 — 필요시 수정) =====
const OFFICE_CODE = "N10";
const SCHOOL_CODE = "8140360";

// ===== 상태 =====
let role = "student";
let teacherUnlocked = false;
let settings = { className: "우리 학급", passcode: "1234" };
let editingPostId = null;
let selectedDate = todayStr();

// ===== 유틸 =====
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
function fmtDate(ymd) {
  return `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}`;
}
function addDays(ymd, n) {
  const y = +ymd.slice(0, 4),
    m = +ymd.slice(4, 6) - 1,
    d = +ymd.slice(6, 8);
  const dt = new Date(y, m, d + n);
  return `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, "0")}${String(
    dt.getDate()
  ).padStart(2, "0")}`;
}
function el(id) {
  return document.getElementById(id);
}

// ===== 초기화 =====
async function init() {
  await loadSettings();
  bindEvents();
  renderRole();
  subscribeToPosts();
  el("dateLabel").textContent = fmtDate(selectedDate);
  loadMeal();
}

// ===== 설정 (Firestore: settings/config) =====
async function loadSettings() {
  try {
    const doc = await db.collection("meta").doc("config").get();
    if (doc.exists) {
      settings = { ...settings, ...doc.data() };
    }
  } catch (e) {
    console.error("설정 로드 실패", e);
  }
  el("classNameLabel").textContent = settings.className;
  el("classNameInput").value = settings.className;
  el("officeCodeLabel").value = OFFICE_CODE;
  el("schoolCodeLabel").value = SCHOOL_CODE;
}

async function saveSettings() {
  settings.className = el("classNameInput").value.trim() || "우리 학급";
  const newPass = el("passcodeInput").value.trim();
  if (newPass) settings.passcode = newPass;
  try {
    await db.collection("meta").doc("config").set(settings, { merge: true });
    el("classNameLabel").textContent = settings.className;
    alert("저장했어요.");
  } catch (e) {
    alert("저장에 실패했어요: " + e.message);
  }
}

// ===== 게시판 (Firestore: posts) =====
function subscribeToPosts() {
  db.collection("posts")
    .orderBy("createdAt", "desc")
    .onSnapshot((snap) => {
      const posts = [];
      snap.forEach((doc) => posts.push({ id: doc.id, ...doc.data() }));
      renderPosts(posts);
    });
}

function renderPosts(posts) {
  const list = el("postList");
  list.innerHTML = "";
  if (posts.length === 0) {
    list.innerHTML = `<div class="empty">아직 게시글이 없어요.${
      role === "teacher" ? " 위 버튼으로 첫 글을 작성해보세요." : " 선생님이 곧 공지를 올려주실 거예요."
    }</div>`;
    return;
  }
  posts.forEach((p) => {
    const card = document.createElement("div");
    card.className = "post-card";
    const dateLabel = p.date || "";
    card.innerHTML = `
      <div class="post-header-row">
        <div class="pin"></div>
        <div style="flex:1;">
          <div class="post-title"></div>
          <div class="post-date">${dateLabel}</div>
        </div>
        <div style="color:#b7c0cc;font-size:18px;">+</div>
      </div>
      <div class="post-body hidden"></div>
    `;
    card.querySelector(".post-title").textContent = p.title;
    const bodyEl = card.querySelector(".post-body");
    const contentDiv = document.createElement("div");
    contentDiv.textContent = p.content;
    bodyEl.appendChild(contentDiv);

    if (role === "teacher") {
      const actions = document.createElement("div");
      actions.className = "post-actions";
      actions.innerHTML = `<button class="small-btn edit-btn">수정</button><button class="small-btn del-btn" style="color:#D65A5A;">삭제</button>`;
      actions.querySelector(".edit-btn").onclick = (ev) => {
        ev.stopPropagation();
        startEditPost(p);
      };
      actions.querySelector(".del-btn").onclick = (ev) => {
        ev.stopPropagation();
        deletePost(p.id);
      };
      bodyEl.appendChild(actions);
    }

    const headerRow = card.querySelector(".post-header-row");
    const toggleIcon = card.querySelector(".post-header-row > div:last-child");
    headerRow.onclick = () => {
      const isHidden = bodyEl.classList.contains("hidden");
      bodyEl.classList.toggle("hidden");
      toggleIcon.textContent = isHidden ? "–" : "+";
    };

    list.appendChild(card);
  });
}

function startNewPost() {
  editingPostId = null;
  el("postTitleInput").value = "";
  el("postContentInput").value = "";
  el("editCard").classList.remove("hidden");
}
function startEditPost(p) {
  editingPostId = p.id;
  el("postTitleInput").value = p.title;
  el("postContentInput").value = p.content;
  el("editCard").classList.remove("hidden");
}
function cancelEdit() {
  el("editCard").classList.add("hidden");
}
async function submitPost() {
  const title = el("postTitleInput").value.trim();
  const content = el("postContentInput").value.trim();
  if (!title) return;
  const now = new Date();
  const dateLabel = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}.${String(now.getDate()).padStart(2, "0")}`;
  try {
    if (editingPostId) {
      await db.collection("posts").doc(editingPostId).update({ title, content });
    } else {
      await db.collection("posts").add({
        title,
        content,
        date: dateLabel,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
    el("editCard").classList.add("hidden");
  } catch (e) {
    alert("저장에 실패했어요: " + e.message);
  }
}
async function deletePost(id) {
  if (!confirm("이 글을 삭제할까요?")) return;
  try {
    await db.collection("posts").doc(id).delete();
  } catch (e) {
    alert("삭제에 실패했어요: " + e.message);
  }
}

// ===== 급식표 (GitHub Actions가 만든 로컬 JSON 파일 사용) =====
async function loadMeal() {
  const area = el("mealArea");
  area.innerHTML = `<div class="empty">불러오는 중…</div>`;
  const ym = selectedDate.slice(0, 6);
  try {
    const res = await fetch(`meal-data/meal_${ym}.json?t=${Date.now()}`);
    if (!res.ok) throw new Error("파일 없음");
    const data = await res.json();
    if (data.RESULT || !data.mealServiceDietInfo) {
      area.innerHTML = `<div class="empty">이 날짜엔 급식 정보가 없어요.</div>`;
      return;
    }
    const rows = data.mealServiceDietInfo[1].row.filter(
      (r) => r.MLSV_YMD === selectedDate
    );
    if (rows.length === 0) {
      area.innerHTML = `<div class="empty">이 날짜엔 급식 정보가 없어요.</div>`;
      return;
    }
    area.innerHTML = "";
    rows.forEach((m) => {
      const card = document.createElement("div");
      card.className = "meal-card";
      const dishes = m.DDISH_NM.split("<br/>")
        .map((d) => `<div>${d.replace(/\([0-9.]+\)/g, "").trim()}</div>`)
        .join("");
      card.innerHTML = `
        <div class="meal-badge">${m.MMEAL_SC_NM}</div>
        <div class="meal-dish">${dishes}</div>
        ${m.CAL_INFO ? `<div class="cal-info">${m.CAL_INFO}</div>` : ""}
      `;
      area.appendChild(card);
    });
  } catch (e) {
    area.innerHTML = `<div class="empty">아직 이 달의 급식 데이터가 준비되지 않았어요. GitHub Actions가 처음 한 번 실행된 뒤부터 보여요.</div>`;
  }
}

// ===== 역할 전환 / 잠금 =====
function renderRole() {
  const isTeacher = role === "teacher";
  document.querySelectorAll(".role-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.role === role);
  });
  document.querySelectorAll(".teacher-only").forEach((b) => {
    b.classList.toggle("hidden", !(isTeacher && teacherUnlocked));
  });

  if (isTeacher && !teacherUnlocked) {
    el("lockScreen").classList.remove("hidden");
    el("mainArea").classList.add("hidden");
  } else {
    el("lockScreen").classList.add("hidden");
    el("mainArea").classList.remove("hidden");
  }
  // re-render posts to show/hide teacher controls
  subscribeToPostsOnce();
}
function subscribeToPostsOnce() {
  db.collection("posts")
    .orderBy("createdAt", "desc")
    .get()
    .then((snap) => {
      const posts = [];
      snap.forEach((doc) => posts.push({ id: doc.id, ...doc.data() }));
      renderPosts(posts);
    })
    .catch(() => {});
}

function tryUnlock() {
  const val = el("passInput").value;
  if (val === settings.passcode) {
    teacherUnlocked = true;
    el("passError").textContent = "";
    el("passInput").value = "";
    renderRole();
  } else {
    el("passError").textContent = "비밀번호가 틀렸어요.";
  }
}

function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  document.querySelectorAll(".tab-panel").forEach((p) => {
    p.classList.toggle("hidden", p.id !== `tab-${tab}`);
  });
  if (tab === "meal") loadMeal();
}

// ===== 이벤트 바인딩 =====
function bindEvents() {
  document.querySelectorAll(".role-btn").forEach((b) => {
    b.onclick = () => {
      role = b.dataset.role;
      if (role === "teacher" && !teacherUnlocked) {
        el("lockScreen").classList.remove("hidden");
        el("mainArea").classList.add("hidden");
        document.querySelectorAll(".role-btn").forEach((x) =>
          x.classList.toggle("active", x.dataset.role === role)
        );
      } else {
        renderRole();
      }
    };
  });

  el("unlockBtn").onclick = tryUnlock;
  el("passInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryUnlock();
  });

  document.querySelectorAll(".tab-btn").forEach((b) => {
    b.onclick = () => switchTab(b.dataset.tab);
  });

  el("newPostBtn").onclick = startNewPost;
  el("savePostBtn").onclick = submitPost;
  el("cancelPostBtn").onclick = cancelEdit;

  el("prevDayBtn").onclick = () => {
    selectedDate = addDays(selectedDate, -1);
    el("dateLabel").textContent = fmtDate(selectedDate);
    loadMeal();
  };
  el("nextDayBtn").onclick = () => {
    selectedDate = addDays(selectedDate, 1);
    el("dateLabel").textContent = fmtDate(selectedDate);
    loadMeal();
  };
  el("todayBtn").onclick = () => {
    selectedDate = todayStr();
    el("dateLabel").textContent = fmtDate(selectedDate);
    loadMeal();
  };

  el("saveSettingsBtn").onclick = saveSettings;
}

init();
