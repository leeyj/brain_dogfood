#!/bin/bash

# --- 🧠 뇌사료 서버 관리 스크립트 ---

APP_NAME="brain.py"

# 어디서 호출하든 이 스크립트가 있는 앱 폴더 기준으로 동작
# (릴리스 구조: <base>/current -> releases/<id>, 상태 파일은 <base>/shared)
APP_DIR="$(cd "$(dirname "$0")" && pwd -P)"
cd "$APP_DIR" || exit 1
if [ -d "$APP_DIR/../../shared" ]; then
    STATE_DIR="$(cd "$APP_DIR/../../shared" && pwd -P)"   # 모든 릴리스가 같은 PID 파일 공유
else
    STATE_DIR="$APP_DIR"                                    # 단일 폴더 설치 (기존 방식, Docker 등)
fi
PID_FILE="$STATE_DIR/server.pid"
LOG_FILE="logs/console.log"

# 로그 디렉토리 생성 확인 (릴리스 구조에선 shared/logs 를 가리키는 링크)
mkdir -p logs

start() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null; then
            echo "⚠️  서버가 이미 실행 중입니다. (PID: $PID)"
            return
        fi
    fi

    echo "🚀 서버를 백그라운드에서 시작합니다... (Port: 5093)"
    # nohup으로 실행하여 세션 종료 후에도 유지
    nohup python3 $APP_NAME > $LOG_FILE 2>&1 &
    
    # PID 저장
    echo $! > "$PID_FILE"
    echo "✅ 서버 기동 완료! (PID: $!)"
    echo "📝 콘솔 로그: $LOG_FILE"
}

stop() {
    # 1. PID 파일 기반 종료 시도
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        echo "🛑 PID 파일을 사용하여 서버 중지 시도... (PID: $PID)"
        if kill -0 $PID 2>/dev/null; then
            kill $PID 2>/dev/null
            # 종료 대기
            for i in {1..3}; do
                if ! kill -0 $PID 2>/dev/null; then break; fi
                sleep 1
            done
        fi
        rm -f "$PID_FILE"
    fi

    # 2. 이름 기반 잔류 프로세스 정밀 소탕
    # grep -v grep 등으로 자기 자신이나 엉뚱한 프로세스가 죽지 않도록 필터링
    REMAINING_PIDS=$(ps aux | grep "python3 $APP_NAME" | grep -v "grep" | awk '{print $2}')
    
    if [ ! -z "$REMAINING_PIDS" ]; then
        echo "🔍 관리 외 잔류 프로세스 감지: $REMAINING_PIDS"
        echo "🛑 잔류 프로세스를 강제 종료합니다..."
        kill -9 $REMAINING_PIDS 2>/dev/null
    fi
    echo "✅ 모든 프로세스가 정리되었습니다."
}

status() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null; then
            echo "🟢 서버가 현재 실행 중입니다. (PID: $PID)"
        else
            echo "🔴 PID 파일은 있으나 프로세스가 존재하지 않습니다."
        fi
    else
        echo "⚪ 서버가 중지 상태입니다."
    fi
}

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        stop
        sleep 2
        start
        ;;
    status)
        status
        ;;
    *)
        echo "사용법: $0 {start|stop|restart|status}"
        exit 1
esac

exit 0
