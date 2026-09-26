import { EmailSummary } from "../types/email";

interface EmailTableProps {
  emails: EmailSummary[];
  type: "scheduled" | "sent";
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export function EmailTable({ emails, type }: EmailTableProps) {
  if (!emails.length) {
    return (
      <div className="rounded-xl border border-gray-100 py-16 text-center text-sm text-gray-400">
        No {type} emails
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-5 py-3">Email</th>
            <th className="px-5 py-3">Subject</th>
            <th className="px-5 py-3">
              {type === "scheduled" ? "Scheduled time" : "Sent time"}
            </th>
            <th className="px-5 py-3">Status</th>
          </tr>
        </thead>

        <tbody>
          {emails.map((email) => (
            <tr key={email.id} className="border-t border-gray-100">
              <td className="px-5 py-4">{email.recipient}</td>
              <td className="px-5 py-4">{email.subject}</td>
              <td className="px-5 py-4 text-gray-500">
                {formatDate(type === "scheduled" ? email.scheduled_time : email.sent_time)}
              </td>
              <td className="px-5 py-4">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs capitalize">
                  {email.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}