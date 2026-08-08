import React from 'react';

export const WHATSAPP_PHONE = '34699592326';

export function getWhatsAppLink(message = '') {
  const defaultText = "Hola Jordi, m'agradaria fer-te una consulta sobre un Món Mínim.";
  const text = message ? message : defaultText;
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
}

export function WhatsAppIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.333 4.993L2 22l5.233-1.337a9.957 9.957 0 004.779 1.221h.005c5.505 0 9.988-4.478 9.989-9.984 0-2.669-1.038-5.177-2.925-7.063A9.923 9.923 0 0012.012 2zm.005 18.156h-.004a8.31 8.31 0 01-4.238-1.164l-.304-.18-3.149.805.836-3.047-.197-.31a8.307 8.307 0 01-1.275-4.46c0-4.584 3.731-8.315 8.319-8.315 2.22 0 4.307.865 5.875 2.434 1.567 1.568 2.43 3.656 2.429 5.876 0 4.585-3.731 8.316-8.317 8.316zm4.561-6.223c-.25-.125-1.478-.728-1.707-.811-.229-.084-.396-.125-.563.125-.166.25-.646.811-.792.977-.146.166-.292.187-.542.062a6.837 6.837 0 01-2.012-1.242 7.545 7.545 0 01-1.393-1.737c-.146-.25-.016-.385.109-.509.112-.112.25-.291.375-.437.125-.146.166-.25.25-.416.083-.166.042-.312-.021-.437-.062-.125-.562-1.353-.77-1.853-.203-.487-.41-.421-.563-.429-.145-.008-.312-.008-.479-.008s-.437.062-.666.312c-.229.25-.875.854-.875 2.083s.896 2.417 1.021 2.583c.125.166 1.763 2.692 4.27 3.774.596.257 1.062.41 1.425.526.598.19 1.142.163 1.572.099.479-.071 1.478-.604 1.687-1.187.208-.583.208-1.083.146-1.187-.063-.105-.229-.167-.479-.292z" />
    </svg>
  );
}

export function FloatingWhatsApp() {
  return (
    <a
      href={getWhatsAppLink()}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-3.5 py-3.5 md:px-4 md:py-3 rounded-full bg-surface/85 backdrop-blur-md border border-primary/25 text-primary shadow-lg hover:shadow-xl hover:bg-primary hover:text-on-primary transition-all duration-300 group cursor-pointer"
      title="Contacta per WhatsApp amb Mínim Món"
      aria-label="Contacta per WhatsApp amb Mínim Món"
    >
      <WhatsAppIcon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 shrink-0" />
      <span className="text-xs font-medium font-body-md whitespace-nowrap overflow-hidden transition-all duration-300 max-w-0 opacity-0 md:max-w-xs md:opacity-100 group-hover:max-w-xs group-hover:opacity-100">
        Parlem per WhatsApp?
      </span>
    </a>
  );
}
