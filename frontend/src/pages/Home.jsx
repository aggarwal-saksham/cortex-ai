import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaGoogle } from "react-icons/fa";
import ArtifactPanel from "../components/ArtifactPanel";
import ChatArea from "../components/ChatArea";
import Sidebar from "../components/Sidebar";
import api from "../utils/axios";
import { setUserData } from "../redux/user.slice";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../firebase";

function Home() {
  const { userData } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const [loadingText, setLoadingText] = useState("");

  useEffect(() => {
    if (!userData) {
      setLoadingText(""); // Reset button state when user logs out
    }
  }, [userData]);

  const login = async (token, retries = 5) => {
    try {
      const { data } = await api.post(`/api/auth/login`, { token });
      dispatch(setUserData(data.user));
    } catch (error) {
      if (retries > 0) {
        console.log("Server cold start, retrying in 10s...");
        setLoadingText("Waking up server... (~40s)");
        // Wait 10 seconds and try again automatically
        setTimeout(() => login(token, retries - 1), 10000);
      } else {
        setLoadingText("Connection failed. Please refresh.");
        console.error("Login failed after multiple retries", error);
      }
    }
  };

  const handleGoogleLogin = async () => {
    if (loadingText) return; // Prevent spam clicking
    try {
      setLoadingText("Authenticating...");
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      await login(token);
    } catch (error) {
      console.error("Google sign in error", error);
      setLoadingText("");
    }
  };

  return (
    <div className="h-screen flex bg-[#0d0f14] text-white overflow-hidden">
      <Sidebar />
      <ChatArea />
      <ArtifactPanel />

      {!userData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[340px] bg-[#13151c] border border-white/[0.08] rounded-2xl p-7 flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-[17px] font-semibold text-slate-100 tracking-tight">
                Welcome to CortexAI
              </h2>
              <p className="text-[13px] text-slate-500">
                Please login to continue using the app.
              </p>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={!!loadingText}
              className={`w-full flex items-center justify-center gap-3 py-[11px] rounded-xl text-sm font-medium text-white bg-gradient-to-br from-indigo-500 to-violet-700 hover:from-indigo-400 hover:to-violet-600 active:from-indigo-600 active:to-violet-800 border border-indigo-500/30 shadow-lg shadow-indigo-500/20 transition-all duration-150 ${loadingText ? "opacity-70 cursor-not-allowed" : "hover:shadow-indigo-500/30 cursor-pointer"}`}
            >
              {loadingText ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {loadingText}
                </>
              ) : (
                <>
                  <FaGoogle size={15} className="text-white" />
                  Continue with Google
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
