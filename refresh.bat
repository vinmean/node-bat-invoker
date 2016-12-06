cd %1
jar xvf code.zip
cd %1\invoker
start /w npm-refresh.bat
copy %1\watch.txt %1\watcher
