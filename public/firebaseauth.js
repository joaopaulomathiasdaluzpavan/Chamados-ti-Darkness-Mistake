// Importa as funções necessárias do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  getDoc,
  setDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Configurações do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBewv5L88wlFN7zYKV6fIqw-00gbUugyQs",
  authDomain: "mistake-17b02.firebaseapp.com",
  projectId: "mistake-17b02",
  storageBucket: "mistake-17b02.firebasestorage.app",
  messagingSenderId: "664472171200",
  appId: "1:664472171200:web:7e21370176e2ff98b17325",
  measurementId: "G-D4GQR80J6G"
};

// Inicializa Auth e Firestore a partir da instância 'app'
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Função para exibir mensagens temporárias na interface
function showMessage(message, divId) {
  const messageDiv = document.getElementById(divId);
  if (!messageDiv) return;

  messageDiv.style.display = "block";
  messageDiv.innerHTML = message;
  messageDiv.style.opacity = "1";

  setTimeout(() => {
    messageDiv.style.opacity = "0";
  }, 5000);
}

// Garante o documento em "usuarios/{uid}" sem sobrescrever um "perfil" já existente
async function syncUserProfile(user, provider, extraFields = {}) {
  const userRef = doc(db, "usuarios", user.uid);
  const snap = await getDoc(userRef);

  const nameParts = (user.displayName || "").trim().split(/\s+/);
  const defaultFirstName = extraFields.firstName ?? (nameParts[0] || "");
  const defaultLastName = extraFields.lastName ?? nameParts.slice(1).join(" ");

  let role = "user";

  if (!snap.exists()) {
    role = "user";
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || "",
      firstName: defaultFirstName,
      lastName: defaultLastName,
      provider,
      perfil: role,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    });
  } else {
    const existingData = snap.data() || {};
    role = existingData.perfil || existingData.role || "user";

    await setDoc(
      userRef,
      {
        email: user.email || existingData.email || "",
        provider: existingData.provider || provider,
        lastLoginAt: new Date().toISOString()
      },
      { merge: true }
    );
  }

  localStorage.setItem("loggedInUserId", user.uid);
  localStorage.setItem("userRole", role);
  return role;
}

// Envia token e perfil para o back-end Express sincronizar a sessão
async function notifyBackendAuth(user, role) {
  try {
    const idToken = await user.getIdToken();
    await fetch("/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid: user.uid,
        email: user.email,
        perfil: role,
        idToken
      })
    });
  } catch (err) {
    console.warn("Não foi possível sincronizar sessão com o servidor:", err);
  }
}

// Lógica de cadastro de novos usuários (E-mail e senha)
const signUpBtn = document.getElementById("submitSignUp");
if (signUpBtn) {
  signUpBtn.addEventListener("click", async (event) => {
    event.preventDefault();

    const email = document.getElementById("rEmail")?.value.trim() || "";
    const password = document.getElementById("rPassword")?.value || "";
    const firstName = document.getElementById("fName")?.value.trim() || "";
    const lastName = document.getElementById("lName")?.value.trim() || "";

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const role = await syncUserProfile(user, "password", { firstName, lastName });
      await notifyBackendAuth(user, role);

      showMessage("Conta criada com sucesso", "signUpMessage");
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Erro no cadastro:", error.code, error.message);
      if (error.code === "auth/email-already-in-use") {
        showMessage("Endereço de email já existe", "signUpMessage");
      } else {
        showMessage(`Não é possível criar usuário (${error.code || "erro"})`, "signUpMessage");
      }
    }
  });
}

// Lógica de login de usuários existentes (E-mail e senha)
const signInBtn = document.getElementById("submitSignIn");
if (signInBtn) {
  signInBtn.addEventListener("click", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email")?.value.trim() || "";
    const password = document.getElementById("password")?.value || "";

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const role = await syncUserProfile(user, "password");
      await notifyBackendAuth(user, role);

      showMessage("Usuário logado com sucesso", "signInMessage");
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Erro no login:", error.code, error.message);
      if (error.code === "auth/invalid-credential") {
        showMessage("Email ou senha incorreta", "signInMessage");
      } else {
        showMessage(`Essa conta não existe (${error.code || "erro"})`, "signInMessage");
      }
    }
  });
}

// Lógica de login/cadastro com Google
async function handleGoogleSignIn(messageDivId) {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const role = await syncUserProfile(user, "google");
    await notifyBackendAuth(user, role);

    showMessage("Login com Google realizado com sucesso!", messageDivId);
    window.location.href = "/dashboard";
  } catch (error) {
    console.error("Erro no login com Google:", error.code, error.message);

    if (error.code === "auth/popup-closed-by-user") {
      showMessage("Janela de login fechada antes de concluir.", messageDivId);
    } else if (error.code === "auth/popup-blocked") {
      showMessage("O pop-up foi bloqueado pelo navegador.", messageDivId);
    } else if (error.code === "auth/unauthorized-domain") {
      showMessage("Domínio não autorizado no Firebase Authentication.", messageDivId);
    } else if (error.code === "auth/account-exists-with-different-credential") {
      showMessage("Este e-mail já está vinculado a outro método de login.", messageDivId);
    } else {
      showMessage(`Não foi possível fazer login com o Google (${error.code || "erro"}).`, messageDivId);
    }
  }
}

// Liga o clique aos botões/ícones do Google nas telas de cadastro e login
document.querySelectorAll("#signup .fa-google, #signup .google-btn, #googleSignUp").forEach((el) => {
  el.addEventListener("click", (event) => {
    event.preventDefault();
    handleGoogleSignIn("signUpMessage");
  });
});

document.querySelectorAll("#signIn .fa-google, #signIn .google-btn, #googleSignIn").forEach((el) => {
  el.addEventListener("click", (event) => {
    event.preventDefault();
    handleGoogleSignIn("signInMessage");
  });

  
});

const btnLogout = document.getElementById("btn-logout");

if (btnLogout) {
  btnLogout.addEventListener("click", async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
    } catch (err) {
      console.error("Erro ao sair do Firebase:", err);
    }

    try {
      await fetch("/logout", { method: "POST" });
    } catch (err) {
      console.error("Erro ao limpar sessão no servidor:", err);
    }

    window.location.href = "/";
  })};