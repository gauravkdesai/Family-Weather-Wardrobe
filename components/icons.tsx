import React from 'react';

export const SunnyIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg viewBox="0 0 64 64" className={className || "w-12 h-12"}>
        <defs><linearGradient id="sunny_grad" x1="27.5" x2="36.5" y1="17.21" y2="31.79" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#fbbf24"/><stop offset="1" stopColor="#f59e0b"/></linearGradient></defs>
        <circle cx="32" cy="32" r="14" fill="url(#sunny_grad)"/>
        <path d="M32,12.5a2,2,0,0,1-2-2v-4a2,2,0,0,1,4,0v4A2,2,0,0,1,32,12.5Z" fill="#FDB813"/>
        <path d="M15.16,19.16a2,2,0,0,1-1.41-3.42l2.83-2.83a2,2,0,0,1,2.83,2.83l-2.83,2.83A2,2,0,0,1,15.16,19.16Z" fill="#FDB813"/>
        <path d="M9.5,34H5.5a2,2,0,0,1,0-4h4a2,2,0,0,1,0,4Z" fill="#FDB813"/>
        <path d="M16.58,48.84a2,2,0,0,1-1.41-3.42l2.83-2.83a2,2,0,1,1,2.83,2.83l-2.83,2.83A2,2,0,0,1,16.58,48.84Z" fill="#FDB813"/>
        <path d="M32,55.5a2,2,0,0,1-2-2v-4a2,2,0,0,1,4,0v4A2,2,0,0,1,32,55.5Z" fill="#FDB813"/>
        <path d="M47.42,48.84a2,2,0,0,1-1.41-.59l-2.83-2.83a2,2,0,0,1,2.83-2.83l2.83,2.83a2,2,0,0,1-1.42,3.42Z" fill="#FDB813"/>
        <path d="M55.5,34h-4a2,2,0,0,1,0-4h4a2,2,0,0,1,0,4Z" fill="#FDB813"/>
        <path d="M48.84,19.16a2,2,0,0,1-1.42-.58L44.59,15.75a2,2,0,0,1,2.83-2.83l2.83,2.83a2,2,0,0,1-1.41,3.41Z" fill="#FDB813"/>
    </svg>
);

export const CloudyIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg viewBox="0 0 64 64" className={className || "w-12 h-12"}>
        <defs><linearGradient id="cloudy_grad" x1="16.5" x2="47.5" y1="18" y2="46" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#d4d7dd"/><stop offset="1" stopColor="#f3f4f6"/></linearGradient></defs>
        <path d="M46,26a14,14,0,0,0-27.28,5.15A12,12,0,0,0,12,43H46a10,10,0,0,0,0-20,10.23,10.23,0,0,0-1.5.14A14,14,0,0,0,46,26Z" fill="url(#cloudy_grad)" stroke="#9ca3af" strokeMiterlimit="10" strokeWidth="2"/>
    </svg>
);

export const PartlyCloudyIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg viewBox="0 0 64 64" className={className || "w-12 h-12"}>
        <defs>
            <linearGradient id="partly_cloudy_sun_grad" x1="27.5" x2="36.5" y1="17.21" y2="31.79" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#fbbf24"/><stop offset="1" stopColor="#f59e0b"/></linearGradient>
            <linearGradient id="partly_cloudy_cloud_grad" x1="22" x2="44" y1="26" y2="44" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#f3f4f6"/><stop offset="1" stopColor="#d4d7dd"/></linearGradient>
        </defs>
        <g>
            <circle cx="28" cy="25" r="11" fill="url(#partly_cloudy_sun_grad)"/>
            <path d="M28 10a2 2 0 01-2-2V4a2 2 0 014 0v4a2 2 0 01-2 2z" fill="#FDB813"/>
            <path d="M15.16 15.16a2 2 0 01-1.41-3.42l2.83-2.83a2 2 0 112.83 2.83l-2.83 2.83a2 2 0 01-1.42.59z" fill="#FDB813"/>
            <path d="M13 27h-4a2 2 0 010-4h4a2 2 0 010 4z" fill="#FDB813"/>
        </g>
        <path d="M49.4 36.4a12 12 0 10-22.8 4.4H48a10 10 0 001.4-4.4z" fill="url(#partly_cloudy_cloud_grad)" stroke="#9ca3af" strokeMiterlimit="10" strokeWidth="2"/>
    </svg>
);


export const RainIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg viewBox="0 0 64 64" className={className || "w-12 h-12"}>
        <defs>
            <linearGradient id="rain_cloud_grad" x1="22" x2="44" y1="22" y2="40" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#9ca3af"/><stop offset="1" stopColor="#6b7280"/></linearGradient>
        </defs>
        <path d="M49.4,32.4a12,12,0,1,0-22.8,4.4H48A10,10,0,0,0,49.4,32.4Z" fill="url(#rain_cloud_grad)" stroke="#4b5563" strokeMiterlimit="10" strokeWidth="2"/>
        <path d="M28 54a2 2 0 01-2-2V46a2 2 0 114 0v6a2 2 0 01-2 2z" fill="#3b82f6"/>
        <path d="M36 54a2 2 0 01-2-2V46a2 2 0 114 0v6a2 2 0 01-2 2z" fill="#3b82f6"/>
        <path d="M44 54a2 2 0 01-2-2V46a2 2 0 014 0v6a2 2 0 01-2 2z" fill="#3b82f6"/>
    </svg>
);

export const SnowIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg viewBox="0 0 64 64" className={className || "w-12 h-12"}>
        <defs><linearGradient id="snow_cloud_grad" x1="22" x2="44" y1="22" y2="40" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#9ca3af"/><stop offset="1" stopColor="#6b7280"/></linearGradient></defs>
        <path d="M49.4,32.4a12,12,0,1,0-22.8,4.4H48A10,10,0,0,0,49.4,32.4Z" fill="url(#snow_cloud_grad)" stroke="#4b5563" strokeMiterlimit="10" strokeWidth="2"/>
        <g fill="#93c5fd">
            <circle cx="29" cy="47" r="2.5"/>
            <circle cx="37" cy="53" r="2.5"/>
            <circle cx="45" cy="47" r="2.5"/>
        </g>
    </svg>
);

export const WindyIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg viewBox="0 0 64 64" className={className || "w-12 h-12"}>
        <defs><linearGradient id="wind_grad_1" x1="15" x2="48" y1="25" y2="35" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#d1d5db"/><stop offset="1" stopColor="#9ca3af"/></linearGradient><linearGradient id="wind_grad_2" x1="21" x2="48" y1="36" y2="46" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#e5e7eb"/><stop offset="1" stopColor="#b0b5b9"/></linearGradient></defs>
        <path d="M19.7,33.58A4.5,4.5,0,0,1,15.2,29.1a4.48,4.48,0,0,1,3.13-1.28H48.2a2.5,2.5,0,0,0,0-5H21.7a4.5,4.5,0,0,0-4.48,4.28,4.45,4.45,0,0,0,4.48,4.72h23a2.5,2.5,0,0,1,0,5H19.7Z" fill="url(#wind_grad_1)"/>
        <path d="M26.2,45.58a4.5,4.5,0,0,1-4.5-4.5,4.48,4.48,0,0,1,3.13-4.28H48.2a2.5,2.5,0,0,0,0-5H24.83a4.5,4.5,0,0,0-4.48,4.28,4.45,4.45,0,0,0,4.48,4.72H43.7a2.5,2.5,0,0,1,0,5Z" fill="url(#wind_grad_2)"/>
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
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-1.007 1.11-1.226l.003-.001c.52-.19 1.07-.19 1.59 0l.003.001c.55.219 1.02.684 1.11 1.226l.099.596c.217.412.513.784.878 1.094l.552.467c.44.372.995.547 1.554.43l.612-.125c.52-.106 1.049.079 1.45.488l.4.401c.402.402.593.93.488 1.451l-.125.612c-.117.56.058 1.114.43 1.554l.467.552c.31.365.682.661 1.094.878l.596.099c.542.09.931.56 1.226 1.11l.001.003c.19.52.19 1.07 0 1.59l-.001.003c-.219.55-.684 1.02-1.226 1.11l-.596.099c-.412.217-.784.513-1.094.878l-.467.552c-.372.44-.547.995-.43 1.554l.125.612c.106.52-.079 1.049-.488 1.45l-.4.401c-.402.402-.93.593-1.451-.488l-.612-.125c-.56-.117-1.114-.058-1.554-.43l-.552-.467c-.365-.31-.661-.682-.878-1.094l-.099-.596c-.09-.542-.56-.931-1.11-1.226l-.003-.001c-.52-.19-1.07-.19-1.59-0l-.003-.001c-.55-.219-1.02-.684-1.11-1.226l-.099-.596c-.217-.412-.513-.784-.878-1.094l-.552-.467c-.44-.372-.995-.547-1.554-.43l-.612-.125c-.52-.106-1.049-.079-1.45-.488l-.4-.401c-.402-.402-.593-.93-.488-1.451l.125-.612c.117-.56-.058-1.114-.43-1.554l-.467-.552c-.31-.365-.682-.661-1.094-.878l-.596-.099c-.542-.09-1.007-.56-1.226-1.11l-.001-.003c-.19-.52-.19-1.07-0-1.59l.001-.003c.219-.55.684-1.02 1.226-1.11l.596-.099c.412-.217.784-.513 1.094-.878l.467.552c.372-.44.547.995.43-1.554l-.125-.612c-.106-.52.079-1.049.488-1.45l.4-.401c.402-.402.93-.593 1.451-.488l.612.125c.56.117 1.114-.058 1.554-.43l.552-.467c.365-.31.661-.682-.878-1.094l.099-.596Z" />
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

export const ChevronLeftIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
  </svg>
);

export const ChevronRightIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
  </svg>
);

export const SunriseIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636m12.728 0-4.95-4.95a.75.75 0 0 0-1.06 0l-4.95 4.95M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 18.75h18" />
    </svg>
);

export const MoonIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
);