import math
import matplotlib.pyplot as plt
#!/usr/bin/env python3
def calcula_endpoint(head_ang_deg, extension, stem_ang_deg, height):
    phi_h = math.radians(180.0 - head_ang_deg)
    h_x = height * math.cos(phi_h)
    h_y = height * math.sin(phi_h)

    phi_e = math.radians(90.0 - head_ang_deg + stem_ang_deg)
    e_x = extension * math.cos(phi_e)
    e_y = extension * math.sin(phi_e)

    return h_x + e_x, h_y + e_y

def calcula_deltas(configs, head_ang):
    resultados = []
    reference_name, reference_config = configs[0]
    p_ref = calcula_endpoint(head_ang, *reference_config[:3])
    phi_ref = math.radians(reference_config[4])
    full_ref = (p_ref[0] + reference_config[3]*math.cos(phi_ref),
                p_ref[1] + reference_config[3]*math.sin(phi_ref))

    for name, config in configs[1:]:
        p_end = calcula_endpoint(head_ang, *config[:3])
        phi_hb = math.radians(config[4])
        full = (p_end[0] + config[3]*math.cos(phi_hb),
                p_end[1] + config[3]*math.sin(phi_hb))

        dx = full[0] - full_ref[0]
        dy = full[1] - full_ref[1]
        nivel = 'higher' if dy > 0 else 'lower'
        texto = f"{name} has {dx:.1f} mm more reach and {abs(dy):.1f} mm {nivel} than {reference_name}"
        resultados.append(texto)

    return resultados

def dibuja(head_ang, configs):
    fig, ax = plt.subplots(figsize=(7,7))
    ax.set_aspect('equal','box')
    ax.grid(True, linestyle='--', alpha=0.3)

    max_ext = max(cfg[0] for _, cfg in configs)
    max_h   = max(cfg[2] for _, cfg in configs)
    max_hb  = max(cfg[3] for _, cfg in configs)
    L = max_ext * 1.3 + max_h + max_hb

    theta = math.radians(180.0 - head_ang)
    ax.plot([0, L * math.cos(theta)], [0, L * math.sin(theta)],
            color='gold', linewidth=4, label='Steerer axis')

    colors = ['green', 'red', 'blue', 'purple', 'orange', 'cyan']
    for i, (name, config) in enumerate(configs):
        color = colors[i % len(colors)]
        ext, ang, h, hb_len, hb_ang = config

        phi_h = math.radians(180.0 - head_ang)
        hx, hy = h * math.cos(phi_h), h * math.sin(phi_h)

        phi_e = math.radians(90.0 - head_ang + ang)
        ex, ey = ext * math.cos(phi_e), ext * math.sin(phi_e)
        x0, y0 = hx + ex, hy + ey

        ax.plot([0, hx], [0, hy], color=color, linewidth=3)
        ax.plot([hx, x0], [hy, y0], color=color, linewidth=2, label=f'{name}')

        phi_hb = math.radians(hb_ang)
        bx, by = hb_len * math.cos(phi_hb), hb_len * math.sin(phi_hb)
        ax.plot([x0, x0 + bx], [y0, y0 + by],
                color=color, linewidth=2, linestyle='--')

    # Añadir los resultados como texto en la esquina inferior izquierda
    deltas_text = '\n'.join(calcula_deltas(configs, head_ang))
    ax.text(0.02, 0.5, deltas_text, transform=ax.transAxes,
            fontsize=9, va='bottom', ha='left',
            bbox=dict(boxstyle="round,pad=0.5", facecolor='white', alpha=0.8))

    ax.legend(loc='upper left')
    ax.set_xlabel('X (mm)')
    ax.set_ylabel('Y (mm)')
    ax.set_title('Comparación: stems con manillares distintos')
    plt.show()
