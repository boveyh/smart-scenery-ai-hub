@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.  See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership.  The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License.  You may obtain a copy of the License at
@REM
@REM    http://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied.  See the License for the
@REM specific language governing permissions and limitations
@REM under the License.
@REM ----------------------------------------------------------------------------

@REM Begin all REM lines with '@' in case MAVEN_BATCH_ECHO is 'on'
@echo off
@REM set title of command window
title %0
@REM enable echoing by setting MAVEN_BATCH_ECHO to 'on'
@if "%MAVEN_BATCH_ECHO%" == "on"  echo %MAVEN_BATCH_ECHO%

@REM set %HOME% to equivalent of $HOME
if "%HOME%" == "" (set "HOME=%USERPROFILE%")

set "MAVEN_PROJECTBASEDIR=%CD%"
set "WRAPPER_DIR=%MAVEN_PROJECTBASEDIR%\.mvn\wrapper"
set "WRAPPER_JAR=%WRAPPER_DIR%\maven-wrapper.jar"

if not exist "%WRAPPER_JAR%" (
    echo ERROR: Maven Wrapper JAR not found at %WRAPPER_JAR%
    exit /b 1
)

set "MAVEN_USER_HOME=%USERPROFILE%\.m2"
set "MVNW_VERBOSE=false"
set "MAVEN_CONFIG=%MAVEN_PROJECTBASEDIR%\.mvn"

@REM Define MAVEN_OPTS for JVM
set "MAVEN_OPTS=-Xmx1024m -XX:MaxMetaspaceSize=256m"

@REM Build classpath and launch
set "CP=%WRAPPER_JAR%"
java -classpath "%CP%" org.apache.maven.wrapper.MavenWrapperMain ^
    -Dmaven.multiModuleProjectDirectory="%MAVEN_PROJECTBASEDIR%" ^
    %*
