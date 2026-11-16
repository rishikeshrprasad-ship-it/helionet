#!/usr/bin/env python3
"""
Full reproducible pipeline orchestrator for HelioNet space weather model.
Runs steps 1 through 9 in sequence and asserts completion of each stage.
"""
import os
import sys
import subprocess
import time

STEPS = [
    ("Step 1: Build Features", "build_features.py"),
    ("Step 2: Build Labels", "build_labels.py"),
    ("Step 3: Temporal Split", "split.py"),
    ("Step 4: Baselines Evaluation", "baselines.py"),
    ("Step 5: Model Training & Ablation", "train.py"),
    ("Step 6: Probability Calibration", "calibrate.py"),
    ("Step 7: Test Evaluation & Metrics", "evaluate.py"),
    ("Step 8: ONNX Export & Verification", "export_onnx.py"),
    ("Step 9: Real Replay & Events Index", "make_replay.py"),
]

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    print("=" * 70)
    print(" HELIONET COMPLETE MODEL TRAINING & REPRODUCIBILITY PIPELINE")
    print("=" * 70)

    total_t0 = time.time()

    for idx, (step_title, script_name) in enumerate(STEPS, 1):
        print(f"\n[{idx}/{len(STEPS)}] >>> {step_title} ({script_name})")
        t0 = time.time()
        script_path = os.path.join(script_dir, script_name)

        if not os.path.exists(script_path):
            print(f"FATAL: Pipeline script not found: {script_path}")
            sys.exit(1)

        cmd = [sys.executable, "-u", script_path]
        res = subprocess.run(cmd, cwd=script_dir)

        if res.returncode != 0:
            print(f"\nFATAL: {step_title} FAILED with exit code {res.returncode}. Aborting pipeline.")
            sys.exit(res.returncode)

        elapsed = time.time() - t0
        print(f"[{idx}/{len(STEPS)}] Done in {elapsed:.1f}s.")

    total_elapsed = time.time() - total_t0
    print("\n" + "=" * 70)
    print(f" PIPELINE COMPLETED SUCCESSFULLY IN {total_elapsed:.1f} SECONDS")
    print("=" * 70)

if __name__ == "__main__":
    main()
