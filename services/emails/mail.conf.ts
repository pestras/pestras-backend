import { MailDataRequired } from "@sendgrid/mail";

const DASHBOARD_URL = process.env.DASHBOARD_URL;
const EMAIL_ACTIVITION_PATH = process.env.EMAIL_ACTIVITION_PATH;
const RESET_PASSWORD_PATH = process.env.RESET_PASSWORD_PATH;

export enum MailType {
  VERIFY_EMAIL = 'verify_email',
  RESET_PASS = 'reset_password',
  NEW_MEMBER = 'new_member'
}

export function getDashboardLink(mailType: MailType) {
  return mailType === MailType.NEW_MEMBER
    ? `${DASHBOARD_URL}/${EMAIL_ACTIVITION_PATH}`
    : `${DASHBOARD_URL}/${RESET_PASSWORD_PATH}`;
}

const SenderMetaData = {
  Sender_Name: "© 2021 Pestras",
  Sender_Address: "Jordan",
  Sender_State: "Amman",
  Sender_City: "Al Matar",
  Sender_Zip: "25441"
}

const MailConf: { [key: string]: MailDataRequired } = {
  verify_email: {
    to: '',
    from: "noreply@pestras.com",
    asm: { groupId: 19089, groupsToDisplay: [19089] },
    templateId: "d-b3beb869b116476794daabdf6c0a06ef",
    dynamicTemplateData: {}
  },
  reset_password: {
    to: '',
    from: "noreply@pestras.com",
    asm: { groupId: 19089, groupsToDisplay: [19089] },
    templateId: "d-b3beb869b116476794daabdf6c0a06ef",
    dynamicTemplateData: {}
  },
  new_member: {
    to: '',
    from: "noreply@pestras.com",
    asm: { groupId: 19089, groupsToDisplay: [19089] },
    templateId: "d-810aea39d053431e80bf9ede0fd1149e",
    dynamicTemplateData: {}
  }
}

export function getMail(name: string, to: string, data?: any): Readonly<MailDataRequired> {
  if (!MailConf.hasOwnProperty(name))
    return null;

  return {
    ...MailConf[name],
    to,
    dynamicTemplateData: Object.assign(
      {},
      MailConf[name].dynamicTemplateData,
      SenderMetaData,
      data || {}
    )
  };
}