"""Geometría 2D de potencia y manillar. Unidades: milímetros y grados."""

import math


def _finite(*values):
    if any(isinstance(value, bool) or not isinstance(value, (int, float))
           or not math.isfinite(value) for value in values):
        raise ValueError("Las medidas deben ser números finitos.")


def calcula_endpoint(head_ang_deg, extension, stem_ang_deg, height):
    """Centro del manillar. Height se mide por el eje, hasta el centro de potencia."""
    _finite(head_ang_deg, extension, stem_ang_deg, height)
    if not 0 < head_ang_deg < 90 or extension <= 0 or height < 0:
        raise ValueError("Dirección entre 0 y 90°, longitud positiva y altura no negativa.")
    phi_h = math.radians(180.0 - head_ang_deg)
    phi_e = math.radians(90.0 - head_ang_deg + stem_ang_deg)
    return (height * math.cos(phi_h) + extension * math.cos(phi_e),
            height * math.sin(phi_h) + extension * math.sin(phi_e))


def calcula_punto(head_ang, config):
    """Extremo del vector de reach; no incluye manetas ni posición de las manos."""
    if len(config) != 5:
        raise ValueError("Cada montaje necesita longitud, ángulo, altura, reach y ángulo del vector.")
    extension, angle, height, reach, rotation = config
    _finite(reach, rotation)
    if reach <= 0:
        raise ValueError("El reach debe ser positivo.")
    x, y = calcula_endpoint(head_ang, extension, angle, height)
    phi = math.radians(rotation)
    return x + reach * math.cos(phi), y + reach * math.sin(phi)


def calcula_deltas(configs, head_ang):
    """Diferencias frente al primer montaje, con dirección y redondeo explícitos."""
    if not configs:
        raise ValueError("Añade al menos un montaje.")
    reference_name, reference_config = configs[0]
    x_ref, y_ref = calcula_punto(head_ang, reference_config)
    resultados = []
    for name, config in configs[1:]:
        x, y = calcula_punto(head_ang, config)
        dx, dy = x - x_ref, y - y_ref
        horizontal = "mismo alcance" if abs(dx) < 0.05 else f"{abs(dx):.1f} mm {'más adelante' if dx > 0 else 'más atrás'}"
        vertical = "misma altura" if abs(dy) < 0.05 else f"{abs(dy):.1f} mm {'más alto' if dy > 0 else 'más bajo'}"
        resultados.append(f"{name}: {horizontal}, {vertical} respecto a {reference_name}")
    return resultados


def dibuja(head_ang, configs):
    """Gráfico de escritorio opcional; Matplotlib solo es necesario aquí."""
    deltas = calcula_deltas(configs, head_ang)
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(9, 7))
    ax.set_aspect("equal", "box")
    ax.grid(True, linestyle="--", alpha=0.2)
    theta = math.radians(180.0 - head_ang)
    axis_length = max(100, max(config[2] for _, config in configs) + 30)
    ax.plot([0, axis_length * math.cos(theta)], [0, axis_length * math.sin(theta)],
            color="#879889", linewidth=4, alpha=0.6, label="Eje de dirección")
    colors = ["#687563", "#bb4b24", "#2c8779", "#8a66b3"]
    for index, (name, config) in enumerate(configs):
        extension, angle, height, _, _ = config
        mount = height * math.cos(theta), height * math.sin(theta)
        clamp = calcula_endpoint(head_ang, extension, angle, height)
        end = calcula_punto(head_ang, config)
        color = colors[index % len(colors)]
        ax.plot([0, mount[0], clamp[0]], [0, mount[1], clamp[1]],
                color=color, linewidth=2, marker="o", markersize=3, label=name)
        ax.plot([clamp[0], end[0]], [clamp[1], end[1]], color=color, linestyle="--")
        ax.plot(end[0], end[1], "o", color=color, markersize=5)
    ax.legend(loc="best")
    ax.set_xlabel("Alcance X (mm)")
    ax.set_ylabel("Altura Y (mm)")
    ax.set_title("Real Reach · Comparación de montajes")
    fig.text(0.08, 0.02, "\n".join(deltas), fontsize=8, va="bottom")
    fig.tight_layout(rect=(0, min(0.45, 0.04 + len(deltas) * 0.025), 1, 1))
    plt.show()
