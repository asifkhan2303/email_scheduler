import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env";
import { findSender, senders } from "./sender.service";
import { htmlToText, toHtml } from "../utils/html";

const transporters = new Map<string, Transporter>();

function transporterFor(address: string): Transporter {
  const sender = findSender(address) ?? senders[0];
  let transporter = transporters.get(sender.address);

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.etherealHost,
      port: env.etherealPort,
      secure: false,
      auth: { user: sender.user, pass: sender.password }
    });
    transporters.set(sender.address, transporter);
  }

  return transporter;
}

export async function sendEmail(
  from: string,
  to: string,
  subject: string,
  body: string
) {
  const info = await transporterFor(from).sendMail({
    from,
    to,
    subject,
    text: htmlToText(body),
    html: toHtml(body)
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);

  return {
    messageId: info.messageId,
    previewUrl: previewUrl || null
  };
}
