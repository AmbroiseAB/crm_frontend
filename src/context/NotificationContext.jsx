import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { notificationsApi } from "../lib/services";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const {user} = useAuth();
  const [notifications, setNotifications] = useState([]);

  const refreshNotifications = () => {
    if (!user) return Promise.resolve();
    return notificationsApi.list().then((res) => setNotifications(res.notifications || []));
  };

  useEffect(() => {
    if (!user) { setNotifications([]); return; }
    refreshNotifications().catch(() => setNotifications([]));
  }, [user]);

  const markAsRead = (id) => {
    notificationsApi.markRead(id).then((res) => setNotifications((current) => current.map((item) => item._id === id ? res.notification : item))).catch(() => {});
  };

  const clearNotifications = () => { notificationsApi.clear().then(() => setNotifications([])).catch(() => {}); };
  const deleteNotification = (id) => { notificationsApi.remove(id).then(() => setNotifications((current) => current.filter((item) => item._id !== id))).catch(() => {}); };
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAsRead, clearNotifications, deleteNotification, refreshNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within NotificationProvider");
  return context;
}
