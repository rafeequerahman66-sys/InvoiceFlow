"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { archiveClient, deleteClient } from "@/actions/clients";

export function ClientDangerZone({ clientId, canDelete }: { clientId: string; canDelete: boolean }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const run = (fn: () => Promise<unknown>, after?: () => void) => () => {
    setBusy(true);
    fn()
      .then(() => after?.())
      .catch((e) => alert((e as Error).message))
      .finally(() => setBusy(false));
  };

  return (
    <Card>
      <CardHeader>Manage</CardHeader>
      <CardBody className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={busy}
          onClick={run(() => archiveClient(clientId), () => router.push("/clients"))}
        >
          Archive client
        </Button>
        {canDelete && (
          <Button
            variant="danger"
            size="sm"
            className="w-full"
            disabled={busy}
            onClick={() => {
              if (confirm("Permanently delete this client?")) run(() => deleteClient(clientId), () => router.push("/clients"))();
            }}
          >
            Delete client
          </Button>
        )}
      </CardBody>
    </Card>
  );
}
