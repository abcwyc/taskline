import { InboxItem, inboxItems as mockNotifications, NotificationType } from '@/mock-data/inbox';
import { create } from 'zustand';

import {
   fetchNotifications,
   markAllNotificationsRead,
   markNotificationRead,
} from '@/lib/api/notifications';

interface NotificationsState {
   notifications: InboxItem[];
   selectedNotification: InboxItem | undefined;
   hydrated: boolean;
   hydrate: () => Promise<void>;

   setSelectedNotification: (notification: InboxItem | undefined) => void;
   markAsRead: (id: string) => void;
   markAllAsRead: () => void;
   markAsUnread: (id: string) => void;

   getUnreadNotifications: () => InboxItem[];
   getReadNotifications: () => InboxItem[];
   getNotificationsByType: (type: NotificationType) => InboxItem[];
   getNotificationsByUser: (userId: string) => InboxItem[];
   getNotificationById: (id: string) => InboxItem | undefined;
   getUnreadCount: () => number;
}

const setRead = (list: InboxItem[], id: string, read: boolean) =>
   list.map((n) => (n.id === id ? { ...n, read } : n));

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
   notifications: mockNotifications,
   selectedNotification: undefined,
   hydrated: false,

   hydrate: async () => {
      if (get().hydrated) return;
      try {
         set({ notifications: await fetchNotifications(), hydrated: true });
      } catch (err) {
         console.error(err);
      }
   },

   setSelectedNotification: (notification) => set({ selectedNotification: notification }),

   markAsRead: (id) => {
      set((state) => ({
         notifications: setRead(state.notifications, id, true),
         selectedNotification:
            state.selectedNotification?.id === id
               ? { ...state.selectedNotification, read: true }
               : state.selectedNotification,
      }));
      markNotificationRead(id, true).catch((e) => console.error(e));
   },

   markAllAsRead: () => {
      set((state) => ({
         notifications: state.notifications.map((n) => ({ ...n, read: true })),
         selectedNotification: state.selectedNotification
            ? { ...state.selectedNotification, read: true }
            : undefined,
      }));
      markAllNotificationsRead().catch((e) => console.error(e));
   },

   markAsUnread: (id) => {
      set((state) => ({
         notifications: setRead(state.notifications, id, false),
         selectedNotification:
            state.selectedNotification?.id === id
               ? { ...state.selectedNotification, read: false }
               : state.selectedNotification,
      }));
      markNotificationRead(id, false).catch((e) => console.error(e));
   },

   getUnreadNotifications: () => get().notifications.filter((n) => !n.read),
   getReadNotifications: () => get().notifications.filter((n) => n.read),
   getNotificationsByType: (type) => get().notifications.filter((n) => n.type === type),
   getNotificationsByUser: (userId) => get().notifications.filter((n) => n.user.id === userId),
   getNotificationById: (id) => get().notifications.find((n) => n.id === id),
   getUnreadCount: () => get().notifications.filter((n) => !n.read).length,
}));
