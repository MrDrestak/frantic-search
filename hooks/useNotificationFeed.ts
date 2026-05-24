'use client';

import { useEffect, useState } from 'react';
import { notificationService } from '@/services/store';
import type { AppNotification } from '@/types';

export function useNotificationFeed(userId: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load existing notifications on mount.
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    notificationService
      .getUserNotifications(userId)
      .then((data) => {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.read).length);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  // Push new notifications into state as they arrive.
  useEffect(() => {
    if (!userId) return;

    const channel = notificationService.subscribeToNotifications(userId, (n) => {
      setNotifications((prev) => [n, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return () => { channel.unsubscribe(); };
  }, [userId]);

  async function markAsRead(notificationId: string) {
    await notificationService.markAsRead(notificationId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function markAllAsRead() {
    if (!userId) return;
    await notificationService.markAllAsRead(userId);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  async function dismiss(notificationId: string) {
    await notificationService.deleteNotification(notificationId);
    const removed = notifications.find((n) => n.id === notificationId);
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    if (removed && !removed.read) setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, dismiss };
}
