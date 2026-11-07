"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { api, timestamp } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Drawer, Empty, ErrorState, Skeleton } from "@/components/ui/shared";
type Notification = {
  id: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
};
export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      api<{ items: Notification[]; unread: number }>("/notifications"),
    refetchInterval: 10000,
  });
  return (
    <>
      <Button
        variant="ghost"
        aria-label="Notifications"
        onClick={() => setOpen(true)}
      >
        <Bell size={20} />
        {!!query.data?.unread && (
          <span className="count-pill">{query.data.unread}</span>
        )}
      </Button>
      <Drawer
        title="Notification center"
        open={open}
        onClose={() => setOpen(false)}
      >
        {query.isPending ? (
          <Skeleton />
        ) : query.error ? (
          <ErrorState error={query.error} />
        ) : query.data.items.length ? (
          <div className="detail-content notification-list">
            {query.data.items.map((item) => (
              <article
                key={item.id}
                className={item.read_at ? "read" : "unread"}
              >
                <strong>{item.title}</strong>
                <p>{item.message}</p>
                <small>{timestamp(item.created_at)}</small>
                <div>
                  <Link
                    href="/alerts"
                    className="text-link"
                    onClick={() => setOpen(false)}
                  >
                    Open alert queue →
                  </Link>
                  {!item.read_at && (
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        try {
                          await api(`/notifications/${item.id}`, {
                            method: "PATCH",
                            body: "{}",
                          });
                          await client.invalidateQueries({
                            queryKey: ["notifications"],
                          });
                        } catch (error) {
                          toast.error((error as Error).message);
                        }
                      }}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty text="Policy notifications will appear here when an alert requires your attention." />
        )}
      </Drawer>
    </>
  );
}
