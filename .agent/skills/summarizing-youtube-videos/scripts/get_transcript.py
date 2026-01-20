#!/usr/bin/env python3
"""
YouTube 视频转录提取工具

从 YouTube 视频获取字幕/转录文本，支持多语言优先级。
输出 JSON 格式，包含时间戳和文本内容。

使用方法：
    python get_transcript.py <video_url_or_id> [--lang zh,en] [--format json|text|srt]

依赖安装：
    pip install youtube-transcript-api

示例：
    python get_transcript.py "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    python get_transcript.py dQw4w9WgXcQ --lang en --format text
"""

import argparse
import json
import re
import sys
from typing import Optional, List, Dict, Any


def extract_video_id(url_or_id: str) -> Optional[str]:
    """
    从 YouTube URL 或直接的视频 ID 提取视频 ID
    
    支持的 URL 格式：
    - https://www.youtube.com/watch?v=VIDEO_ID
    - https://youtu.be/VIDEO_ID
    - https://www.youtube.com/embed/VIDEO_ID
    - https://www.youtube.com/v/VIDEO_ID
    - 直接的 11 位视频 ID
    """
    # 如果已经是 11 位 ID 格式
    if re.match(r'^[a-zA-Z0-9_-]{11}$', url_or_id):
        return url_or_id
    
    patterns = [
        r'(?:v=|/v/|youtu\.be/)([a-zA-Z0-9_-]{11})',
        r'(?:embed/)([a-zA-Z0-9_-]{11})',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url_or_id)
        if match:
            return match.group(1)
    
    return None


def get_transcript(
    video_id: str,
    languages: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    获取视频转录文本
    
    Args:
        video_id: YouTube 视频 ID
        languages: 语言优先级列表，默认 ['zh-Hans', 'zh-Hant', 'zh', 'en', 'en-US']
    
    Returns:
        包含转录数据的字典：
        {
            "video_id": str,
            "language": str,
            "is_generated": bool,
            "transcript": [{"start": float, "duration": float, "text": str}, ...]
        }
    """
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except ImportError:
        return {
            "error": "youtube-transcript-api 未安装",
            "solution": "请运行: python -m pip install --break-system-packages youtube-transcript-api"
        }
    
    if languages is None:
        languages = ['zh-Hans', 'zh-Hant', 'zh', 'en', 'en-US']
    
    # 创建 API 实例
    api = YouTubeTranscriptApi()
    
    def convert_to_dict(transcript):
        """将转录对象转换为字典列表"""
        result = []
        for item in transcript:
            if isinstance(item, dict):
                result.append(item)
            else:
                result.append({
                    "start": item.start,
                    "duration": item.duration,
                    "text": item.text
                })
        return result
    
    try:
        # 尝试获取指定语言的字幕
        transcript = api.fetch(video_id, languages=languages)
        return {
            "video_id": video_id,
            "language": "auto-detected",
            "is_generated": False,
            "transcript": convert_to_dict(transcript)
        }
    except Exception:
        pass
    
    # 如果失败，尝试获取任何可用的字幕
    try:
        transcript_list = api.list(video_id)
        
        # 优先手动字幕
        for transcript_info in transcript_list:
            if not transcript_info.is_generated:
                fetched = transcript_info.fetch()
                return {
                    "video_id": video_id,
                    "language": transcript_info.language_code,
                    "is_generated": False,
                    "transcript": convert_to_dict(fetched)
                }
        
        # 其次自动生成字幕
        for transcript_info in transcript_list:
            if transcript_info.is_generated:
                fetched = transcript_info.fetch()
                return {
                    "video_id": video_id,
                    "language": transcript_info.language_code,
                    "is_generated": True,
                    "transcript": convert_to_dict(fetched)
                }
                
    except Exception as e:
        error_msg = str(e)
        if "VideoUnavailable" in error_msg or "video is no longer available" in error_msg.lower():
            return {
                "error": "视频不可用或已被删除",
                "video_id": video_id
            }
        return {
            "error": f"无法获取转录: {error_msg}",
            "video_id": video_id
        }
    
    return {
        "error": "该视频没有可用的字幕",
        "video_id": video_id
    }


def format_as_text(transcript_data: Dict[str, Any]) -> str:
    """将转录数据格式化为纯文本"""
    if "error" in transcript_data:
        return f"错误: {transcript_data['error']}"
    
    lines = []
    for item in transcript_data["transcript"]:
        # 处理对象或字典
        if isinstance(item, dict):
            lines.append(item["text"])
        else:
            lines.append(item.text)
    
    return "\n".join(lines)


def format_as_srt(transcript_data: Dict[str, Any]) -> str:
    """将转录数据格式化为 SRT 字幕格式"""
    if "error" in transcript_data:
        return f"错误: {transcript_data['error']}"
    
    def seconds_to_srt_time(seconds: float) -> str:
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
    
    lines = []
    for i, item in enumerate(transcript_data["transcript"], 1):
        # 处理对象或字典
        if isinstance(item, dict):
            start = item["start"]
            duration = item["duration"]
            text = item["text"]
        else:
            start = item.start
            duration = item.duration
            text = item.text
        
        end = start + duration
        lines.append(str(i))
        lines.append(f"{seconds_to_srt_time(start)} --> {seconds_to_srt_time(end)}")
        lines.append(text)
        lines.append("")
    
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="从 YouTube 视频获取转录文本",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python get_transcript.py "https://www.youtube.com/watch?v=VIDEO_ID"
  python get_transcript.py VIDEO_ID --lang en,zh --format text
  python get_transcript.py VIDEO_ID --format srt > subtitles.srt
        """
    )
    parser.add_argument(
        "video",
        help="YouTube 视频 URL 或视频 ID"
    )
    parser.add_argument(
        "--lang",
        default="zh-Hans,zh-Hant,zh,en,en-US",
        help="语言优先级，逗号分隔 (默认: zh-Hans,zh-Hant,zh,en,en-US)"
    )
    parser.add_argument(
        "--format",
        choices=["json", "text", "srt"],
        default="json",
        help="输出格式 (默认: json)"
    )
    
    args = parser.parse_args()
    
    # 提取视频 ID
    video_id = extract_video_id(args.video)
    if not video_id:
        print(json.dumps({
            "error": f"无法从输入中提取视频 ID: {args.video}"
        }, ensure_ascii=False, indent=2))
        sys.exit(1)
    
    # 获取转录
    languages = [lang.strip() for lang in args.lang.split(",")]
    transcript_data = get_transcript(video_id, languages)
    
    # 格式化输出
    if args.format == "json":
        print(json.dumps(transcript_data, ensure_ascii=False, indent=2))
    elif args.format == "text":
        print(format_as_text(transcript_data))
    elif args.format == "srt":
        print(format_as_srt(transcript_data))
    
    # 如果有错误，返回非零退出码
    if "error" in transcript_data:
        sys.exit(1)


if __name__ == "__main__":
    main()
