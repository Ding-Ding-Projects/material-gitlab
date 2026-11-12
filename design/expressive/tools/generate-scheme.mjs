import {argbFromHex,hexFromArgb,SchemeTonalSpot,SchemeVibrant,Hct,MaterialDynamicColors as M,TonalPalette} from '@material/material-color-utilities';
const seed=Hct.fromInt(argbFromHex(process.argv[2]));
const out={};
for (const dark of [false,true]){
  const s=new (process.argv[3]==="v"?SchemeVibrant:SchemeTonalSpot)(seed,dark,0.0);
  const keys=['primary','onPrimary','primaryContainer','onPrimaryContainer','secondary','onSecondary','secondaryContainer','onSecondaryContainer','tertiary','onTertiary','tertiaryContainer','onTertiaryContainer','error','onError','errorContainer','onErrorContainer','background','onBackground','surface','surfaceDim','surfaceBright','surfaceContainerLowest','surfaceContainerLow','surfaceContainer','surfaceContainerHigh','surfaceContainerHighest','onSurface','surfaceVariant','onSurfaceVariant','outline','outlineVariant','scrim','shadow','inverseSurface','inverseOnSurface','inversePrimary'];
  const o={}; for(const k of keys){o[k]=hexFromArgb(M[k].getArgb(s));}
  out[dark?'dark':'light']=o;
}
console.log(JSON.stringify(out,null,1));
