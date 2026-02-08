import { PANELISTS } from "./podcast-parser";

export interface StreamTurnEvent {
  type: "turn";
  speakerId: string;
  index: number;
  text: string;
}

export interface StreamDoneEvent {
  type: "done";
}

export type StreamEvent = StreamTurnEvent | StreamDoneEvent;

const SPEAKER_ENTRIES = PANELISTS.map((p) => ({
  id: p.id,
  pattern: `${p.emoji}\\s*${p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[:：]`,
  prefix: `${p.emoji} ${p.name}`,
}));

const SPEAKER_REGEX = new RegExp(
  `(${SPEAKER_ENTRIES.map((e) => e.pattern).join("|")})\\s*`,
  "g"
);

export class StreamingTurnParser {
  private buffer = "";
  private turnIndex = 0;
  private currentSpeakerId: string | null = null;
  private currentText = "";

  feed(chunk: string): StreamEvent[] {
    this.buffer += chunk;
    const events: StreamEvent[] = [];

    let lastProcessedEnd = 0;

    SPEAKER_REGEX.lastIndex = 0;
    const matches: { index: number; length: number; speakerId: string }[] = [];

    let match;
    while ((match = SPEAKER_REGEX.exec(this.buffer)) !== null) {
      const matchedStr = match[1];
      const speaker = SPEAKER_ENTRIES.find((e) =>
        new RegExp(e.pattern).test(matchedStr)
      );
      if (speaker) {
        matches.push({
          index: match.index,
          length: match[0].length,
          speakerId: speaker.id,
        });
      }
    }

    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];

      if (this.currentSpeakerId !== null) {
        const textBefore = this.buffer.slice(lastProcessedEnd, m.index);
        this.currentText += textBefore;

        const trimmed = this.currentText.trim();
        if (trimmed) {
          events.push({
            type: "turn",
            speakerId: this.currentSpeakerId,
            index: this.turnIndex++,
            text: trimmed,
          });
        }
        this.currentText = "";
      }

      this.currentSpeakerId = m.speakerId;
      lastProcessedEnd = m.index + m.length;
    }

    if (matches.length > 0) {
      const remaining = this.buffer.slice(lastProcessedEnd);
      const possiblePartial = this.checkPartialSpeaker(remaining);
      if (possiblePartial >= 0) {
        this.currentText += remaining.slice(0, possiblePartial);
        this.buffer = remaining.slice(possiblePartial);
      } else {
        this.currentText += remaining;
        this.buffer = "";
      }
    } else if (this.currentSpeakerId) {
      const possiblePartial = this.checkPartialSpeaker(this.buffer);
      if (possiblePartial >= 0) {
        this.currentText += this.buffer.slice(0, possiblePartial);
        this.buffer = this.buffer.slice(possiblePartial);
      } else {
        this.currentText += this.buffer;
        this.buffer = "";
      }
    }

    return events;
  }

  flush(): StreamEvent[] {
    const events: StreamEvent[] = [];

    if (this.currentSpeakerId) {
      this.currentText += this.buffer;
      this.buffer = "";

      const trimmed = this.currentText.trim();
      if (trimmed) {
        events.push({
          type: "turn",
          speakerId: this.currentSpeakerId,
          index: this.turnIndex++,
          text: trimmed,
        });
      }
      this.currentSpeakerId = null;
      this.currentText = "";
    }

    return events;
  }

  private checkPartialSpeaker(text: string): number {
    for (const entry of SPEAKER_ENTRIES) {
      const nlIdx = text.lastIndexOf("\n");
      if (nlIdx >= 0) {
        const afterNl = text.slice(nlIdx + 1).trimStart();
        if (afterNl.length > 0 && afterNl.length < entry.prefix.length + 3) {
          if (entry.prefix.startsWith(afterNl.replace(/[:：]\s*$/, ""))) {
            return nlIdx;
          }
        }
      }
    }
    return -1;
  }
}
