import {argbFromHex,hexFromArgb,SchemeVibrant,Hct,TonalPalette} from '@material/material-color-utilities';
const s=new SchemeVibrant(Hct.fromInt(argbFromHex('#6E49CB')),false,0);
const tones=[0,4,6,10,12,17,20,22,24,25,30,35,40,50,60,70,80,87,90,92,94,95,96,98,99,100];
const o={};
for (const [n,p] of [['primary',s.primaryPalette],['secondary',s.secondaryPalette],['neutral',s.neutralPalette],['neutralVariant',s.neutralVariantPalette],['tertiary',TonalPalette.fromInt(argbFromHex('#FC6D26'))],['error',s.errorPalette],['success',TonalPalette.fromInt(argbFromHex('#108548'))],['warning',TonalPalette.fromInt(argbFromHex('#C17D10'))]]){o[n]={};for(const t of tones)o[n][t]=hexFromArgb(p.tone(t));}
console.log(JSON.stringify(o));
