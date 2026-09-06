!macro verifyAgentFiles
  ${IfNot} ${FileExists} "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
    MessageBox MB_OK|MB_ICONSTOP "QA Report Agent: application files could not be extracted. Installation failed. Please download the installer again." /SD IDOK
    SetErrorLevel 1
    Quit
  ${EndIf}
!macroend

!macro customFiles_x64
  !insertmacro verifyAgentFiles
!macroend

!macro customFiles_arm64
  !insertmacro verifyAgentFiles
!macroend
