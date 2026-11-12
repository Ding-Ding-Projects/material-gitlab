import {argbFromHex,hexFromArgb,TonalPalette} from '@material/material-color-utilities';
const p=TonalPalette.fromInt(argbFromHex('#FC6D26'));
const g=TonalPalette.fromInt(argbFromHex('#108548'));const w=TonalPalette.fromInt(argbFromHex('#C17D10'));
const t=(pp,n)=>hexFromArgb(pp.tone(n));
console.log(JSON.stringify({light:{tertiary:t(p,40),onTertiary:t(p,100),tertiaryContainer:t(p,90),onTertiaryContainer:t(p,30),success:t(g,40),successContainer:t(g,90),onSuccessContainer:t(g,30),warning:t(w,40),warningContainer:t(w,90),onWarningContainer:t(w,30)},dark:{tertiary:t(p,80),onTertiary:t(p,20),tertiaryContainer:t(p,30),onTertiaryContainer:t(p,90),success:t(g,80),successContainer:t(g,30),onSuccessContainer:t(g,90),warning:t(w,80),warningContainer:t(w,30),onWarningContainer:t(w,90)}}))
