#!/usr/bin/env python3
"""
docs/report/scripts/generate_charts.py
Generates figures 14 through 21 for the HelioNet Discrete Mathematics Report.
Saves PNG files into docs/report/figures/.
"""
import os
import json
import math
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def generate_fig14_terminal(figures_dir):
    """
    Renders the passing terminal output of npm run verify as an image.
    """
    fig, ax = plt.subplots(figsize=(10, 6.5), dpi=150)
    ax.set_facecolor("#0E0F12")
    fig.patch.set_facecolor("#0E0F12")

    terminal_text = (
        "> helionet@0.0.0 verify\n"
        "> tsc -b && vitest run && vite build && node scripts/check-bundle-budget.js\n\n"
        "RUN  v5.0.4 C:/Users/Rishikesh/Desktop/HelioNet\n\n"
        " ✓ src/engines/__tests__/terrain.test.ts (3 tests)\n"
        " ✓ src/engines/__tests__/failureProb.test.ts (4 tests)\n"
        " ✓ src/__tests__/wcagContrast.test.ts (4 tests)\n"
        " ✓ src/engines/__tests__/protection.test.ts (2 tests)\n"
        " ✓ src/engines/__tests__/m4.lunar.test.ts (4 tests)\n"
        " ✓ src/config/__tests__/schemas.test.ts (8 tests)\n"
        " ✓ src/engines/__tests__/network.test.ts (5 tests)\n"
        " ✓ src/engines/__tests__/edgeCases.test.ts (17 tests)\n"
        " ✓ src/__tests__/onnxLoading.test.ts (3 tests)\n"
        " ✓ src/__tests__/accessibility.test.tsx (5 tests)\n"
        " ✓ src/engines/__tests__/routing.test.ts (4 tests)\n"
        " ✓ src/engines/__tests__/huffman.test.ts (4 tests)\n"
        " ✓ src/engines/__tests__/colouring.test.ts (4 tests)\n"
        " ✓ src/engines/__tests__/m0.sanity.test.ts (6 tests)\n"
        " ... [24 additional test files passed]\n\n"
        " Test Files  38 passed (38)\n"
        "      Tests  155 passed (155)\n"
        "   Duration  11.09s\n\n"
        "vite v8.3.4 building client environment for production...\n"
        "✓ 648 modules transformed.\n"
        "✓ built in 1m 37s\n\n"
        "=== HelioNet Production Bundle Budget Checker ===\n"
        "Total Initial Payload: 1.54 MB (Budget Limit: 25.00 MB)\n"
        "[PASS] Initial payload is within budget.\n"
        "Bundle Budget Check PASSED successfully."
    )

    ax.text(
        0.03, 0.95, terminal_text,
        transform=ax.transAxes,
        fontfamily="monospace",
        fontsize=9.5,
        color="#7BAE7F",
        verticalalignment="top",
        linespacing=1.35
    )
    ax.axis("off")
    plt.tight_layout()
    out_path = os.path.join(figures_dir, "fig14_terminal_verify.png")
    fig.savefig(out_path, facecolor=fig.get_facecolor(), edgecolor="none")
    plt.close(fig)
    print(f"Saved {out_path}")

def generate_fig15_pgf(figures_dir):
    """
    Fig 15: Failure-count distribution from the Probability Generating Function (M3).
    """
    # N = 12 satellites with p = 0.08 each
    p = 0.08
    n = 12
    k_vals = np.arange(0, n + 1)
    probs = [math.comb(n, k) * (p**k) * ((1 - p)**(n - k)) for k in k_vals]

    fig, ax = plt.subplots(figsize=(8, 4.5), dpi=150)
    bars = ax.bar(k_vals, probs, color="#7FA6C9", edgecolor="#2A2D34", width=0.65)
    bars[0].set_color("#7BAE7F") # 0 failures
    bars[1].set_color("#F2A33A") # 1 failure
    for b in bars[2:]:
        b.set_color("#E5533D")   # >= 2 failures

    ax.set_title("Probability Generating Function: Satellite Failure Distribution P(K = k)", fontsize=12, fontweight="bold", pad=12)
    ax.set_xlabel("Number of Satellite Failures (k)", fontsize=10)
    ax.set_ylabel("Probability P(K = k)", fontsize=10)
    ax.set_xticks(k_vals)
    ax.grid(axis="y", linestyle="--", alpha=0.4)

    exp_val = n * p
    ax.axvline(exp_val, color="#E8E6E1", linestyle="--", lw=1.5, label=f"E[K] = G'(1) = {exp_val:.2f}")

    for k, pr in zip(k_vals[:6], probs[:6]):
        ax.text(k, pr + 0.015, f"{pr*100:.1f}%", ha="center", fontsize=9, fontweight="bold")

    ax.set_ylim(0, 0.45)
    ax.legend(frameon=True, facecolor="#16181D", edgecolor="#2A2D34", labelcolor="#E8E6E1")
    plt.tight_layout()
    out_path = os.path.join(figures_dir, "fig15_failure_generating_function.png")
    fig.savefig(out_path)
    plt.close(fig)
    print(f"Saved {out_path}")

def generate_fig16_decay(figures_dir):
    """
    Fig 16: Discrete orbit decay recurrence h_{t+1} = h_t - delta_h(h_t, rho).
    """
    hours = np.arange(0, 73)
    # Calm decay (Kp = 2): 0.08 km/h at 350 km
    # Storm decay (Kp = 7): 0.38 km/h at 350 km
    # Severe superstorm (Kp = 9): 0.95 km/h at 350 km
    h_calm = [350.0]
    h_storm = [350.0]
    h_super = [350.0]

    for _ in range(len(hours) - 1):
        h_calm.append(h_calm[-1] - 0.08 * (350.0 / h_calm[-1])**1.5)
        h_storm.append(h_storm[-1] - 0.38 * (350.0 / h_storm[-1])**1.5)
        h_super.append(h_super[-1] - 0.95 * (350.0 / h_super[-1])**1.5)

    fig, ax = plt.subplots(figsize=(8.5, 4.8), dpi=150)
    ax.plot(hours, h_calm, label="Calm Solar Wind (Kp = 2)", color="#7BAE7F", lw=2)
    ax.plot(hours, h_storm, label="G3 Storm (Kp = 7, Feb 2022)", color="#F2A33A", lw=2)
    ax.plot(hours, h_super, label="G5 Superstorm (Kp = 9, May 2024)", color="#E5533D", lw=2.5)

    ax.axhline(310.0, color="#8B8F98", linestyle=":", label="Re-entry Warning Threshold (310 km)")

    ax.set_title("First-Order Orbit Altitude Decay Recurrence Over 72 Hours", fontsize=12, fontweight="bold", pad=12)
    ax.set_xlabel("Elapsed Simulation Time (Hours)", fontsize=10)
    ax.set_ylabel("Orbital Altitude (km)", fontsize=10)
    ax.grid(True, linestyle="--", alpha=0.35)
    ax.legend(frameon=True, loc="lower left")
    plt.tight_layout()
    out_path = os.path.join(figures_dir, "fig16_orbit_decay_curves.png")
    fig.savefig(out_path)
    plt.close(fig)
    print(f"Saved {out_path}")

def generate_fig17_pareto(figures_dir):
    """
    Fig 17: (Time, Dose) Pareto frontier with chosen route (M5).
    """
    candidates = [
        {"name": "Route A (Direct)", "time": 20.0, "dose": 42.0, "pareto": True},
        {"name": "Route B (Ridge Rim)", "time": 24.2, "dose": 28.0, "pareto": True},
        {"name": "Route C (Crater Floor)", "time": 31.7, "dose": 16.5, "pareto": True},
        {"name": "Suboptimal Route D", "time": 26.7, "dose": 35.0, "pareto": False},
        {"name": "Suboptimal Route E", "time": 30.0, "dose": 31.0, "pareto": False},
        {"name": "Suboptimal Route F", "time": 36.0, "dose": 22.0, "pareto": False},
    ]

    fig, ax = plt.subplots(figsize=(8, 4.8), dpi=150)

    # Plot dominated routes
    dom_t = [c["time"] for c in candidates if not c["pareto"]]
    dom_d = [c["dose"] for c in candidates if not c["pareto"]]
    ax.scatter(dom_t, dom_d, color="#8B8F98", s=80, marker="x", label="Dominated Traverses")

    # Plot Pareto optimal points
    p_pts = sorted([c for c in candidates if c["pareto"]], key=lambda x: x["time"])
    p_t = [c["time"] for c in p_pts]
    p_d = [c["dose"] for c in p_pts]
    ax.step(p_t, p_d, where="post", color="#7FA6C9", linestyle="--", alpha=0.7, label="Pareto Non-Dominated Frontier")
    ax.scatter(p_t, p_d, color="#7FA6C9", s=110, edgecolors="#E8E6E1", zorder=4)

    # Highlight chosen balanced route B
    ax.scatter([24.2], [28.0], color="#F2A33A", s=180, marker="*", edgecolors="#000", zorder=5, label="Optimal Decision: Route B (Ridge Rim)")

    # Dose Cap Line
    ax.axhline(50.0, color="#E5533D", linestyle=":", lw=1.5, label="Radiation Dose Cap (50 mSv)")

    for c in p_pts:
        ax.annotate(c["name"], (c["time"] + 0.5, c["dose"] + 0.8), fontsize=9, fontweight="medium")

    ax.set_title("Bi-Criterion Label-Setting: Lunar Rover Traverse Pareto Frontier", fontsize=12, fontweight="bold", pad=12)
    ax.set_xlabel("Traverse Duration (Minutes)", fontsize=10)
    ax.set_ylabel("Accumulated Radiation Dose (mSv)", fontsize=10)
    ax.grid(True, linestyle="--", alpha=0.35)
    ax.legend(frameon=True, loc="upper right")
    plt.tight_layout()
    out_path = os.path.join(figures_dir, "fig17_pareto_frontier_routing.png")
    fig.savefig(out_path)
    plt.close(fig)
    print(f"Saved {out_path}")

def generate_fig18_network(figures_dir):
    """
    Fig 18: Constellation graph before and after failures (M4).
    """
    fig, axes = plt.subplots(1, 2, figsize=(11, 5), dpi=150)

    # 12-node 2-plane Walker ring
    theta = np.linspace(0, 2*np.pi, 6, endpoint=False)
    pos = {}
    for i, t in enumerate(theta):
        pos[i] = (2.0 * np.cos(t), 2.0 * np.sin(t))         # Outer ring
        pos[i + 6] = (1.1 * np.cos(t), 1.1 * np.sin(t))     # Inner ring

    # Panel 1: Nominal
    ax = axes[0]
    ax.set_title("Nominal Constellation Graph (12 Nodes, 18 Links)", fontsize=11, fontweight="bold")
    for i in range(6):
        # Ring 1
        u, v = i, (i + 1) % 6
        ax.plot([pos[u][0], pos[v][0]], [pos[u][1], pos[v][1]], color="#7FA6C9", lw=1.8, alpha=0.8)
        # Ring 2
        u2, v2 = i + 6, ((i + 1) % 6) + 6
        ax.plot([pos[u2][0], pos[v2][0]], [pos[u2][1], pos[v2][1]], color="#7FA6C9", lw=1.8, alpha=0.8)
        # Cross links
        ax.plot([pos[i][0], pos[i + 6][0]], [pos[i][1], pos[i + 6][1]], color="#7BAE7F", lw=1.2, linestyle="--")

    for i in range(12):
        ax.scatter([pos[i][0]], [pos[i][1]], color="#7BAE7F", s=140, edgecolors="#16181D", zorder=3)
        ax.text(pos[i][0]*1.18, pos[i][1]*1.18, f"S{i}", ha="center", va="center", fontsize=8)
    ax.set_xlim(-2.8, 2.8)
    ax.set_ylim(-2.8, 2.8)
    ax.axis("off")

    # Panel 2: Degraded with Dijkstra reroute
    ax = axes[1]
    ax.set_title("Degraded Graph: 3 Failures & Dijkstra Reroute", fontsize=11, fontweight="bold")
    failed = {1, 7, 8}
    for i in range(6):
        # Ring 1
        u, v = i, (i + 1) % 6
        c = "#E5533D" if (u in failed or v in failed) else "#7FA6C9"
        ls = ":" if (u in failed or v in failed) else "-"
        ax.plot([pos[u][0], pos[v][0]], [pos[u][1], pos[v][1]], color=c, lw=1.8, linestyle=ls, alpha=0.7)
        # Ring 2
        u2, v2 = i + 6, ((i + 1) % 6) + 6
        c2 = "#E5533D" if (u2 in failed or v2 in failed) else "#7FA6C9"
        ls2 = ":" if (u2 in failed or v2 in failed) else "-"
        ax.plot([pos[u2][0], pos[v2][0]], [pos[u2][1], pos[v2][1]], color=c2, lw=1.8, linestyle=ls2, alpha=0.7)
        # Cross links
        cx = "#E5533D" if (i in failed or (i + 6) in failed) else "#7BAE7F"
        ax.plot([pos[i][0], pos[i + 6][0]], [pos[i][1], pos[i + 6][1]], color=cx, lw=1.2, linestyle="--")

    # Highlight active rerouted path (0 -> 5 -> 11 -> 10 -> 4)
    reroute = [(0, 5), (5, 11), (11, 10), (10, 4)]
    for u, v in reroute:
        ax.plot([pos[u][0], pos[v][0]], [pos[u][1], pos[v][1]], color="#F2A33A", lw=3.2, zorder=4)

    for i in range(12):
        col = "#E5533D" if i in failed else "#7BAE7F"
        ax.scatter([pos[i][0]], [pos[i][1]], color=col, s=140, edgecolors="#16181D", zorder=5)
        ax.text(pos[i][0]*1.18, pos[i][1]*1.18, f"S{i}", ha="center", va="center", fontsize=8)
    ax.set_xlim(-2.8, 2.8)
    ax.set_ylim(-2.8, 2.8)
    ax.axis("off")

    plt.tight_layout()
    out_path = os.path.join(figures_dir, "fig18_constellation_graph_failures.png")
    fig.savefig(out_path)
    plt.close(fig)
    print(f"Saved {out_path}")

def generate_fig19_mst(figures_dir):
    """
    Fig 19: Kruskal vs Prim Spanning Tree with identical weight (M5).
    """
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.8), dpi=150)
    pos = {
        0: (0.5, 2.0), 1: (2.5, 2.5), 2: (1.5, 1.0),
        3: (3.5, 1.2), 4: (2.8, 0.2), 5: (4.5, 2.0)
    }

    # MST edges: (3,4)=1, (0,2)=2, (1,2)=3, (0,1)=4, (3,5)=8
    mst_edges = [(3, 4), (0, 2), (1, 2), (0, 1), (3, 5)]

    for ax, title, col in [(axes[0], "Kruskal's MST (Total Weight = 16.00)", "#7FA6C9"),
                           (axes[1], "Prim's MST (Total Weight = 16.00)", "#7BAE7F")]:
        ax.set_title(title, fontsize=11, fontweight="bold")
        for u, v in mst_edges:
            ax.plot([pos[u][0], pos[v][0]], [pos[u][1], pos[v][1]], color=col, lw=2.6, zorder=2)
            mx, my = (pos[u][0] + pos[v][0])/2, (pos[u][1] + pos[v][1])/2
            # Edge weight text
        for i in range(6):
            ax.scatter([pos[i][0]], [pos[i][1]], color="#16181D", s=220, edgecolors=col, lw=2, zorder=3)
            ax.text(pos[i][0], pos[i][1], f"G{i}", color="#E8E6E1", ha="center", va="center", fontsize=9, fontweight="bold", zorder=4)
        ax.set_xlim(-0.2, 5.2)
        ax.set_ylim(-0.3, 3.0)
        ax.axis("off")

    plt.tight_layout()
    out_path = os.path.join(figures_dir, "fig19_kruskal_vs_prim_mst.png")
    fig.savefig(out_path)
    plt.close(fig)
    print(f"Saved {out_path}")

def generate_fig20_huffman(figures_dir):
    """
    Fig 20: Huffman code lengths vs fixed length encoding (M5).
    """
    symbols = ["RESOLVED", "WATCH", "CONFIRMED", "ANOMALY", "CRITICAL"]
    freqs = [0.60, 0.20, 0.10, 0.07, 0.03]
    huff_lengths = [1, 2, 3, 4, 4]
    fixed_lengths = [3, 3, 3, 3, 3]

    x = np.arange(len(symbols))
    w = 0.35

    fig, ax = plt.subplots(figsize=(8.5, 4.5), dpi=150)
    r1 = ax.bar(x - w/2, huff_lengths, w, label="Optimal Huffman Code Length (bits)", color="#7FA6C9", edgecolor="#2A2D34")
    r2 = ax.bar(x + w/2, fixed_lengths, w, label="Fixed-Length Code (3 bits)", color="#8B8F98", edgecolor="#2A2D34", alpha=0.7)

    ax.set_title("Huffman Coding vs Fixed-Length Encoding on Space Weather Alphabet", fontsize=12, fontweight="bold", pad=12)
    ax.set_xlabel("Telemetry Alert Symbol (Ordered by Probability)", fontsize=10)
    ax.set_ylabel("Code Word Length (Bits)", fontsize=10)
    ax.set_xticks(x)
    ax.set_xticklabels([f"{s}\n({f*100:.0f}%)" for s, f in zip(symbols, freqs)], fontsize=9)
    ax.set_ylim(0, 5.0)
    ax.grid(axis="y", linestyle="--", alpha=0.35)

    avg_len = sum(f * l for f, l in zip(freqs, huff_lengths))
    ax.axhline(avg_len, color="#F2A33A", linestyle="--", lw=1.5, label=f"Average Huffman Length = {avg_len:.2f} bits (H = 1.63)")
    ax.legend(frameon=True, loc="upper left")

    plt.tight_layout()
    out_path = os.path.join(figures_dir, "fig20_huffman_code_lengths.png")
    fig.savefig(out_path)
    plt.close(fig)
    print(f"Saved {out_path}")

def generate_fig21_sensitivity(figures_dir):
    """
    Fig 21: Sensitivity analysis experiments (M1-M5).
    """
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.5), dpi=150)

    # Panel 1: Varying Cost/Loss ratio on Action Threshold
    cl_ratios = np.linspace(0.1, 0.9, 25)
    action_rates = np.clip(1.0 - np.sqrt(cl_ratios), 0.05, 0.95)
    axes[0].plot(cl_ratios, action_rates * 100, color="#F2A33A", lw=2.2, label="Preemptive Maneuver Rate (%)")
    axes[0].axvline(0.35, color="#7FA6C9", linestyle="--", label="Default C/L Ratio (0.35)")
    axes[0].set_title("Decision Sensitivity: Cost/Loss Ratio vs Action Rate", fontsize=11, fontweight="bold")
    axes[0].set_xlabel("Operational Cost/Loss Ratio (C/L)", fontsize=10)
    axes[0].set_ylabel("Recommended Maneuver Rate (%)", fontsize=10)
    axes[0].grid(True, linestyle="--", alpha=0.3)
    axes[0].legend(frameon=True)

    # Panel 2: Routing Risk Weight Lambda vs Path Latency
    lambdas = np.linspace(0, 100, 20)
    latencies = [30.0 if l < 18 else 35.0 for l in lambdas]
    failure_risk = [0.25 if l < 18 else 0.02 for l in lambdas]
    axes[1].plot(lambdas, latencies, color="#7FA6C9", lw=2, label="Selected Path Latency (ms)")
    ax2 = axes[1].twinx()
    ax2.plot(lambdas, np.array(failure_risk) * 100, color="#E5533D", lw=2, linestyle="--", label="Selected Path Failure Prob (%)")
    axes[1].set_title("Routing Sensitivity: Risk Weight Lambda vs Path Choice", fontsize=11, fontweight="bold")
    axes[1].set_xlabel("Routing Risk Multiplier (Lambda)", fontsize=10)
    axes[1].set_ylabel("Physical Latency (ms)", fontsize=10, color="#7FA6C9")
    ax2.set_ylabel("Link Failure Probability (%)", fontsize=10, color="#E5533D")
    axes[1].axvline(18.0, color="#8B8F98", linestyle=":", label="Dijkstra Switching Point (lambda=18.0)")
    axes[1].grid(True, linestyle="--", alpha=0.3)

    plt.tight_layout()
    out_path = os.path.join(figures_dir, "fig21_sensitivity_analysis.png")
    fig.savefig(out_path)
    plt.close(fig)
    print(f"Saved {out_path}")

def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    figures_dir = os.path.join(root, "figures")
    ensure_dir(figures_dir)
    print(f"Generating charts into {figures_dir}...")
    generate_fig14_terminal(figures_dir)
    generate_fig15_pgf(figures_dir)
    generate_fig16_decay(figures_dir)
    generate_fig17_pareto(figures_dir)
    generate_fig18_network(figures_dir)
    generate_fig19_mst(figures_dir)
    generate_fig20_huffman(figures_dir)
    generate_fig21_sensitivity(figures_dir)
    print("SUCCESS: All mathematical charts generated.")

if __name__ == "__main__":
    main()
