"""Isolated real Demucs inference process. No user audio leaves this machine."""
from pathlib import Path
import json
import os
import subprocess
import sys
import zipfile


def write_json(path, data):
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(data))
    temp.replace(path)


def separate(source, folder):
    import imageio_ffmpeg
    import numpy as np
    import soundfile as sf
    import torch
    from demucs.pretrained import get_model
    from demucs.apply import apply_model

    torch.set_num_threads(min(4, os.cpu_count() or 1))
    def stage(name, message):
        write_json(folder / 'stage.json', {'stage': name, 'message': message})
    stage('decoding', 'Decoding audio locally…')
    decoded = folder / 'decoded.wav'
    # Bound decoded memory/disk, disable network protocols in the decoder.
    result = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-nostdin', '-v', 'error', '-protocol_whitelist', 'file,pipe',
        '-i', str(source), '-t', '601', '-ar', '44100', '-ac', '2', '-c:a', 'pcm_f32le', '-y', str(decoded)],
        capture_output=True, timeout=120)
    if result.returncode:
        raise ValueError('Cannot decode this audio file. Try a WAV or MP3 file.')
    audio, sr = sf.read(decoded, dtype='float32', always_2d=True)
    decoded.unlink()
    if len(audio) / sr > 600:
        raise ValueError('Please use a track of 10 minutes or less.')
    if len(audio) / sr < 1:
        raise ValueError('Please use at least one second of audio.')
    if not np.isfinite(audio).all():
        raise ValueError('Audio contains invalid samples.')
    stage('model', 'Loading guitar-separation model (first run downloads weights)…')
    model = get_model('htdemucs_6s')
    model.cpu().eval()
    waveform = torch.from_numpy(audio.T.copy())
    reference = waveform.mean(0)
    mean, std = reference.mean(), reference.std()
    std = std.clamp(min=1e-6)
    stage('separating', 'Separating six instruments on your CPU. This can take several minutes…')
    with torch.inference_mode():
        estimates = apply_model(model, ((waveform - mean) / std)[None], device='cpu', shifts=1,
                                split=True, overlap=0.25, segment=7, progress=True, num_workers=0)[0]
    estimates = estimates * std + mean
    # A single common gain preserves relative stem balance and avoids clipping the summed mix.
    peak = max(float(estimates.abs().max()), float(estimates.sum(0).abs().max()), 1.0)
    estimates = estimates * (0.98 / peak)
    stage('encoding', 'Writing lossless stems and download archive…')
    stems = folder / 'stems'
    stems.mkdir(exist_ok=True)
    for name, samples in zip(model.sources, estimates):
        sf.write(stems / f'{name}.wav', samples.T.numpy(), sr, subtype='PCM_16')
    with zipfile.ZipFile(folder / 'stems.zip', 'w', compression=zipfile.ZIP_STORED) as archive:
        for path in sorted(stems.glob('*.wav')):
            archive.write(path, path.name)
    write_json(folder / 'result.json', {'duration': len(audio) / sr, 'sample_rate': sr, 'model': 'htdemucs_6s'})


if __name__ == '__main__':
    source, folder = map(Path, sys.argv[1:])
    try:
        separate(source, folder)
    except Exception as exc:
        write_json(folder / 'error.json', {'message': str(exc)[:500]})
        raise
