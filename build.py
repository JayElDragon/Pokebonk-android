"""Build the editable Android port. Run: python build.py --help"""
from pathlib import Path
import argparse,os,secrets,shutil,subprocess,zipfile
ROOT=Path(__file__).resolve().parent
parser=argparse.ArgumentParser()
parser.add_argument('--signing-dir',type=Path,default=ROOT/'android')
args=parser.parse_args()
sdk=Path(os.environ.get('ANDROID_SDK_ROOT') or os.environ.get('ANDROID_SDK') or r'C:\Program Files\Unity\Hub\Editor\6000.3.13f1\Editor\Data\PlaybackEngines\AndroidPlayer\SDK')
jdk=Path(os.environ.get('JAVA_HOME_17') or os.environ.get('JAVA_HOME') or r'C:\Program Files\Microsoft\jdk-17.0.21.21-hotspot')
bt=sdk/'build-tools/36.0.0'; aj=sdk/'platforms/android-35/android.jar'
for p in [bt/'aapt2.exe',aj,jdk/'bin/javac.exe']:
 if not p.is_file():raise SystemExit(f'Missing required build tool: {p}')
build=ROOT/'work-build';build.mkdir(exist_ok=True)
classes=build/'classes';classes.mkdir(exist_ok=True)
assets=build/'assets';assets.mkdir(exist_ok=True)
# Integrate the editable port components into the distributed web bundle.
bundle=ROOT/'site/assets/main-DE_Gq1n2-mw17215b.js'
code=bundle.read_text(encoding='utf-8')
a=code.index('var PB_EVENTS =');b=code.index('function hA(e)',a)
local=(ROOT/'offline.js').read_text(encoding='utf-8')
code=code[:a]+local[local.index('var PB_EVENTS ='):].rstrip()+'\n'+code[b:]
controls=(ROOT/'patches/controles-corregidos.js').read_text(encoding='utf-8').strip().rstrip(';')
a=code.index('var AN=class');b=code.index(',jN=e=>',a)
code=code[:a]+controls+code[b:]
sprites=(ROOT/'patches/retratos-corregidos.js').read_text(encoding='utf-8')
cut=sprites.index('function jO(')
a=code.index('function pbStartSprite');b=code.index('var yO=',a)
code=code[:a]+sprites[:cut]+code[b:]
a=code.index('function jO(');b=code.index('var MO=',a)
code=code[:a]+sprites[cut:]+code[b:]
navigation=(ROOT/'patches/menu-navigation.js').read_text(encoding='utf-8')
a=code.index('/* JAY_MENU_NAV_START */');b=code.index('/* JAY_MENU_NAV_END */',a)+len('/* JAY_MENU_NAV_END */')
code=code[:a]+'/* JAY_MENU_NAV_START */\n'+navigation+'\n/* JAY_MENU_NAV_END */'+code[b:]
bundle.write_text(code,encoding='utf-8')
shutil.copytree(ROOT/'site',assets/'site',dirs_exist_ok=True)
dist=ROOT/'dist';dist.mkdir(exist_ok=True)
def run(command):subprocess.run([str(x) for x in command],check=True)
run([bt/'aapt2.exe','compile','--dir',ROOT/'android/res','-o',build/'res.zip'])
run([bt/'aapt2.exe','link','-o',build/'resources.apk','-I',aj,'--manifest',ROOT/'android/AndroidManifest.xml','-A',assets,build/'res.zip','--min-sdk-version','26','--target-sdk-version','35','--version-code','22','--version-name','0.8.92-android22','-0','png','-0','jpg','-0','ogg','-0','glb','-0','woff2','-0','woff'])
run([jdk/'bin/javac.exe','-nowarn','-source','11','-target','11','-encoding','UTF-8','-cp',aj,'-d',classes,*list((ROOT/'android/src').rglob('*.java'))])
run([jdk/'bin/java.exe','-cp',bt/'lib/d8.jar','com.android.tools.r8.D8','--release','--min-api','26','--lib',aj,'--output',build,*list(classes.rglob('*.class'))])
with zipfile.ZipFile(build/'resources.apk') as zi,zipfile.ZipFile(build/'unsigned.apk','w') as zo:
 for info in zi.infolist():zo.writestr(info,zi.read(info.filename))
 zo.write(build/'classes.dex','classes.dex',compress_type=zipfile.ZIP_DEFLATED)
run([bt/'zipalign.exe','-p','-f','4',build/'unsigned.apk',build/'aligned.apk'])
signing=args.signing_dir.resolve();signing.mkdir(parents=True,exist_ok=True)
ks=signing/'pokebonk-personal.keystore';props=signing/'keystore.properties'
if ks.exists() and not props.exists():raise SystemExit('The signing keystore exists but keystore.properties is missing.')
if not ks.exists():
 password=secrets.token_urlsafe(24)
 props.write_text('storePassword='+password+'\n',encoding='utf-8')
else:password=next(line.split('=',1)[1] for line in props.read_text(encoding='utf-8').splitlines() if line.startswith('storePassword='))
password_file=build/'signing-password.tmp'
try:
 password_file.write_text(password+'\n'+password+'\n',encoding='utf-8')
 if not ks.exists():run([jdk/'bin/keytool.exe','-genkeypair','-keystore',ks,'-alias','pokebonk','-keyalg','RSA','-keysize','2048','-validity','10000','-storepass:file',password_file,'-keypass:file',password_file,'-dname','CN=JayElDragon Android personal'])
 output=dist/'PokeBonk.apk'
 run([jdk/'bin/java.exe','-jar',bt/'lib/apksigner.jar','sign','--ks',ks,'--ks-key-alias','pokebonk','--ks-pass','file:'+str(password_file),'--key-pass','file:'+str(password_file),'--out',output,build/'aligned.apk'])
finally:password_file.unlink(missing_ok=True)
run([jdk/'bin/java.exe','-jar',bt/'lib/apksigner.jar','verify',dist/'PokeBonk.apk'])
run([bt/'zipalign.exe','-c','4',dist/'PokeBonk.apk'])
print('APK ready:',dist/'PokeBonk.apk')
