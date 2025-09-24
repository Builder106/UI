export function fillConsentTemplate(template: string, data: {
  creatorName: string;
  shotTitle: string;
  shotUrl: string;
  senderName: string;
  senderRole: string;
  senderOrg: string;
  senderEmail: string;
}): string {
  return template
    .replaceAll('<Creator Name>', data.creatorName)
    .replaceAll('<Shot Title>', data.shotTitle)
    .replaceAll('<Dribbble Shot URL>', data.shotUrl)
    .replaceAll('Olayinka Vaughan', data.senderName)
    .replaceAll('Student', data.senderRole)
    .replaceAll('Wesleyan University', data.senderOrg)
    .replaceAll('yvaughan@wesleyan.edu', data.senderEmail);
}


