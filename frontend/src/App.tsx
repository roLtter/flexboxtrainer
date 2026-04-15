import { useEffect, useState, type ReactNode } from "react";
import MainPage from "./pages/MainPage/MainPage";
import { AuthPage } from "./pages/AuthPage";
import { ProfilePage } from "./pages/ProfilePage";
import { Toast } from "./components/Toast";
import { me, logout, type AuthUser } from "./api/auth";
import type { TaskConfig } from "./utils/types";
import type { EditorMode } from "./pages/MainPage/types";

type Route = "auth" | "tasks" | "profile";

function parseRoute(pathname: string): Route {
  if (/^\/profile(?:\/[^/]+)?\/?$/.test(pathname)) return "profile";
  return "tasks";
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.pathname));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [resumeTask, setResumeTask] = useState<{
    taskId: number;
    task: TaskConfig;
    code: string;
    mode?: EditorMode;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.clearTimeout((showToast as unknown as { _t?: number })._t);
    (showToast as unknown as { _t?: number })._t = window.setTimeout(() => setToastMessage(null), 3200);
  };

  const navigate = (nextRoute: Route, userId?: number) => {
    const targetPath = nextRoute === "profile" ? `/profile/${userId ?? "me"}` : "/";
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, "", targetPath);
    }
    setRoute(nextRoute);
  };

  const refreshMe = async () => {
    const currentUser = await me();
    setUser(currentUser);
    if (!currentUser) {
      setRoute("auth");
      return;
    }
    setRoute(parseRoute(window.location.pathname));
  };

  useEffect(() => {
    void refreshMe().finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setRoute((prev) => (prev === "auth" ? "auth" : parseRoute(window.location.pathname)));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  let content: ReactNode;

  if (booting) {
    content = (
      <div className="min-h-screen bg-[#09090f] text-white grid place-items-center">
        <div className="spinner" />
      </div>
    );
  } else if (!user || route === "auth") {
    content = (
      <AuthPage
        onAuthed={() => {
          void refreshMe();
        }}
        onError={showToast}
      />
    );
  } else if (route === "profile") {
    content = (
      <ProfilePage
        user={user}
        onBackToTasks={() => navigate("tasks")}
        onLogout={() => {
          void logout().finally(() => {
            setUser(null);
            navigate("tasks");
            setRoute("auth");
          });
        }}
        onOpenHistoryTask={(payload) => {
          setResumeTask(payload);
          navigate("tasks");
        }}
        onProfileUpdated={(next) => setUser(next)}
        onError={showToast}
      />
    );
  } else {
    content = (
      <MainPage
        userEmail={user.nickname || user.email}
        preloadedTask={resumeTask}
        onError={showToast}
        onOpenProfile={() => navigate("profile", user.id)}
        onLogout={() => {
          void logout().finally(() => {
            setUser(null);
            navigate("tasks");
            setRoute("auth");
          });
        }}
      />
    );
  }

  return (
    <>
      {content}
      {toastMessage && <Toast message={toastMessage} />}
    </>
  );
}