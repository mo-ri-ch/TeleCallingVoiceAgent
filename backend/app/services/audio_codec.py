"""Pure-Python G.711 mu-law codec and 8kHz <-> 16kHz PCM16 resampling.

Bridges Twilio Media Streams (mu-law, 8kHz) and Sarvam AI's STT/TTS APIs
(PCM16 WAV, 16kHz). Python 3.13 removed the `audioop` module, so this
reimplements the classic public-domain mu-law transcoding algorithm (as used
in Sun's g711.c) plus simple linear resampling, with no third-party deps.
"""

import bisect
import io
import wave
from array import array

BIAS = 0x84

TELEPHONY_SAMPLE_RATE = 8000
SARVAM_SAMPLE_RATE = 16000


def _mulaw_to_linear(u_val: int) -> int:
    u_val = ~u_val & 0xFF
    sign = u_val & 0x80
    exponent = (u_val >> 4) & 0x07
    mantissa = u_val & 0x0F
    magnitude = ((mantissa << 3) + BIAS) << exponent
    return (BIAS - magnitude) if sign else (magnitude - BIAS)


# Decode table: mu-law byte (0-255) -> PCM16 sample.
_MULAW_TO_LINEAR = [_mulaw_to_linear(i) for i in range(256)]

# For encoding, pick whichever of the 256 decode values is closest to the
# input sample -- a small, provably-correct nearest-value quantizer built
# directly from the (verified) decode table above.
_ENCODE_TABLE = sorted((value, byte) for byte, value in enumerate(_MULAW_TO_LINEAR))
_ENCODE_VALUES = [pair[0] for pair in _ENCODE_TABLE]
_ENCODE_BYTES = [pair[1] for pair in _ENCODE_TABLE]


def _linear_to_mulaw(sample: int) -> int:
    """Encode a 16-bit PCM sample to the mu-law byte that decodes closest to it."""
    pos = bisect.bisect_left(_ENCODE_VALUES, sample)
    if pos == 0:
        return _ENCODE_BYTES[0]
    if pos == len(_ENCODE_VALUES):
        return _ENCODE_BYTES[-1]
    before, after = _ENCODE_VALUES[pos - 1], _ENCODE_VALUES[pos]
    return _ENCODE_BYTES[pos - 1] if sample - before <= after - sample else _ENCODE_BYTES[pos]


def mulaw_to_pcm16(mulaw_bytes: bytes) -> array:
    """Decode 8-bit mu-law bytes to an array of 16-bit PCM samples."""
    table = _MULAW_TO_LINEAR
    return array("h", (table[b] for b in mulaw_bytes))


def pcm16_to_mulaw(samples: array) -> bytes:
    """Encode 16-bit PCM samples to 8-bit mu-law bytes."""
    return bytes(_linear_to_mulaw(sample) for sample in samples)


def resample_pcm16(samples: array, from_rate: int, to_rate: int) -> array:
    """Linearly resample a PCM16 sample array between sample rates."""
    if from_rate == to_rate or len(samples) == 0:
        return array("h", samples)

    ratio = from_rate / to_rate
    out_length = max(1, round(len(samples) / ratio))
    output = array("h", [0]) * out_length

    for i in range(out_length):
        position = i * ratio
        index = int(position)
        fraction = position - index
        sample_a = samples[index] if index < len(samples) else samples[-1]
        next_index = index + 1
        sample_b = samples[next_index] if next_index < len(samples) else sample_a
        output[i] = int(sample_a + (sample_b - sample_a) * fraction)

    return output


def pcm16_to_wav(samples: array, sample_rate: int) -> bytes:
    """Wrap raw PCM16 samples in a mono WAV container."""
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(samples.tobytes())
    return buffer.getvalue()


def wav_to_pcm16(wav_bytes: bytes) -> tuple[array, int]:
    """Unwrap a mono PCM16 WAV file to (samples, sample_rate)."""
    buffer = io.BytesIO(wav_bytes)
    with wave.open(buffer, "rb") as wav_file:
        sample_rate = wav_file.getframerate()
        frames = wav_file.readframes(wav_file.getnframes())

    samples = array("h")
    samples.frombytes(frames)
    return samples, sample_rate


def twilio_audio_to_wav16k(mulaw_bytes: bytes) -> bytes:
    """Convert inbound Twilio mu-law/8kHz audio to a 16kHz PCM16 WAV, ready
    for Sarvam AI's speech-to-text API."""
    pcm8k = mulaw_to_pcm16(mulaw_bytes)
    pcm16k = resample_pcm16(pcm8k, TELEPHONY_SAMPLE_RATE, SARVAM_SAMPLE_RATE)
    return pcm16_to_wav(pcm16k, SARVAM_SAMPLE_RATE)


def mulaw_to_wav8k(mulaw_bytes: bytes) -> bytes:
    """Convert raw Twilio mu-law/8kHz audio to a mono PCM16 WAV at the same
    sample rate, for saving full-call recordings (Phase 15)."""
    pcm8k = mulaw_to_pcm16(mulaw_bytes)
    return pcm16_to_wav(pcm8k, TELEPHONY_SAMPLE_RATE)


def wav_to_twilio_mulaw(wav_bytes: bytes) -> bytes:
    """Convert a Sarvam TTS WAV response to 8kHz mu-law bytes for streaming
    back to Twilio Media Streams."""
    samples, sample_rate = wav_to_pcm16(wav_bytes)
    pcm8k = resample_pcm16(samples, sample_rate, TELEPHONY_SAMPLE_RATE)
    return pcm16_to_mulaw(pcm8k)


def rms(mulaw_bytes: bytes) -> float:
    """Root-mean-square energy of a mu-law audio chunk, used for simple
    energy-based voice activity detection."""
    if not mulaw_bytes:
        return 0.0
    samples = mulaw_to_pcm16(mulaw_bytes)
    total = sum(sample * sample for sample in samples)
    return (total / len(samples)) ** 0.5
