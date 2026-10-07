from pathlib import Path
import shutil
out=Path("dist")
shutil.rmtree(out,ignore_errors=True)
out.mkdir()
for name in ['index.html', 'app.js', 'exporter.js', 'spinner.js', 'style.css', 'templates.js', 'spy']:
 p=Path(name)
 if p.is_dir():shutil.copytree(p,out/name)
 else:shutil.copy2(p,out/name)
(out/".nojekyll").touch()
