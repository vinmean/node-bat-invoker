@echo off
taskkill /f /t /fi "PID eq %1" /IM cmd.exe