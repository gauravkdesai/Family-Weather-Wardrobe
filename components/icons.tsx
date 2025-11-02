import React from 'react';

const iconProps = {
  className: "w-12 h-12 text-yellow-400",
};

export const SunnyIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || iconProps.className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
  </svg>
);

export const CloudyIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-12 h-12 text-slate-400"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5h10.5a4.5 4.5 0 0 0 4.5-4.5c0-1.933-1.28-3.582-3-4.243-.828-2.292-3.12-3.757-5.75-3.757-3.15 0-5.75 2.507-5.75 5.625a4.48 4.48 0 0 0 .07 1.052c-1.33.61-2.257 1.95-2.257 3.445Z" />
  </svg>
);

export const PartlyCloudyIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-12 h-12 text-slate-400"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clipRule="evenodd" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5h10.5a4.5 4.5 0 0 0 4.5-4.5c0-1.933-1.28-3.582-3-4.243-.828-2.292-3.12-3.757-5.75-3.757-3.15 0-5.75 2.507-5.75 5.625a4.48 4.48 0 0 0 .07 1.052c-1.33.61-2.257 1.95-2.257 3.445Z" />
    </svg>
);


export const RainIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-12 h-12 text-blue-400"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H16.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 16.5h3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 19.5h9" />
  </svg>
);

export const SnowIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-12 h-12 text-sky-300"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m12.75 3-3.35 3.35-2.25-2.25-2.25 2.25-3.35-3.35.5 10.5 3.35-3.35 2.25 2.25 2.25-2.25 3.35 3.35-.5-10.5ZM12.75 11.25 9.4 14.6l-2.25-2.25-2.25 2.25-3.35-3.35.5 10.5 3.35-3.35 2.25 2.25 2.25-2.25 3.35 3.35-.5-10.5Z" />
  </svg>
);

export const WindyIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-12 h-12 text-slate-500"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
  </svg>
);

export const UserGroupIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.75-5.418c-1.5-4.5-6-7.5-10.5-7.5S4.5 8.802 3 13.302a9.094 9.094 0 0 0 3.75 5.418m11.25 0c.261.238.504.487.737.737l1.5-1.5c-.233-.25-.476-.498-.737-.737m-12.5 0c-.261.238-.504.487-.737.737l-1.5-1.5c.233-.25.476-.498.737-.737m12.5 0a9.094 9.094 0 0 1-5.418 3.75c-1.5.5-3.15.5-4.65 0A9.094 9.094 0 0 1 3.75 18.72m11.25 0c-1.5-4.5-6-7.5-10.5-7.5S4.5 14.22 3 18.72" />
    </svg>
);

export const LocationMarkerIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
);

export const CogIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-1.007 1.11-1.226l.003-.001c.52-.19 1.07-.19 1.59 0l.003.001c.55.219 1.02.684 1.11 1.226l.099.596c.217.412.513.784.878 1.094l.552.467c.44.372.995.547 1.554.43l.612-.125c.52-.106 1.049.079 1.45.488l.4.401c.402.402.593.93.488 1.451l-.125.612c-.117.56.058 1.114.43 1.554l.467.552c.31.365.682.661 1.094.878l.596.099c.542.09.931.56 1.226 1.11l.001.003c.19.52.19 1.07 0 1.59l-.001.003c-.219.55-.684 1.02-1.226 1.11l-.596.099c-.412.217-.784.513-1.094.878l-.467.552c-.372.44-.547.995-.43 1.554l.125.612c.106.52-.079 1.049-.488 1.45l-.4.401c-.402.402-.93.593-1.451-.488l-.612-.125c-.56-.117-1.114-.058-1.554-.43l-.552-.467c-.365-.31-.661-.682-.878-1.094l-.099-.596c-.09-.542-.56-.931-1.11-1.226l-.003-.001c-.52-.19-1.07-.19-1.59-0l-.003-.001c-.55-.219-1.02-.684-1.11-1.226l-.099-.596c-.217-.412-.513-.784-.878-1.094l-.552-.467c-.44-.372-.995-.547-1.554-.43l-.612-.125c-.52-.106-1.049-.079-1.45-.488l-.4-.401c-.402-.402-.593-.93-.488-1.451l.125-.612c.117-.56-.058-1.114-.43-1.554l-.467-.552c-.31-.365-.682-.661-1.094-.878l-.596-.099c-.542-.09-1.007-.56-1.226-1.11l-.001-.003c-.19-.52-.19-1.07-0-1.59l.001-.003c.219-.55.684-1.02 1.226-1.11l.596-.099c.412-.217.784-.513 1.094-.878l.467-.552c.372-.44.547.995.43-1.554l-.125-.612c-.106-.52.079-1.049.488-1.45l.4-.401c.402-.402.93-.593 1.451-.488l.612.125c.56.117 1.114-.058 1.554-.43l.552-.467c.365-.31.661-.682-.878-1.094l.099-.596Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
);

export const TrashIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
);

export const CalendarIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0h18M-4.5 12h22.5" />
    </svg>
);

export const PinIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75V16.5L12 14.25L7.5 16.5V3.75m9 0H18A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6A2.25 2.25 0 0 1 6 3.75h1.5m9 0h-9" />
    </svg>
);

export const SolidPinIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-6 h-6"}>
        <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" clipRule="evenodd" />
    </svg>
);