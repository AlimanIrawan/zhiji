"""
脂肪变化估算算法
根据热量收支和训练类型估算每日脂肪变化量
"""

def estimate_fat_change(cal_in, cal_out, training_type):
    """
    根据卡路里收支与训练类型估算脂肪变化量（克）
    
    参数：
        cal_in: float, 当天总摄入卡路里
        cal_out: float, 当天总消耗卡路里（含训练）
        training_type: str, "none", "A", "S", "both"
            - none: 无运动
            - A: 仅有氧
            - S: 仅无氧
            - both: 有氧+无氧
    
    返回：
        dict: {
            'D': 热量差 (摄入 - 消耗, kcal),
            'mode': 'deficit' 或 'surplus',
            'ratio': 当日脂肪转换比例,
            'fat_change_g': 脂肪变化量（负值为减脂，正值为增脂）
        }
    """
    D = cal_in - cal_out  # 热量差，正值=盈余，负值=赤字
    
    # === 情况1：赤字（减脂） ===
    if D < 0:
        D_abs = abs(D)
        # 赤字区间基础系数
        if D_abs <= 700:
            f_base = 0.60
        elif D_abs <= 900:
            f_base = 0.55
        else:
            f_base = 0.45
        
        # 训练修正（赤字时）
        t_adj = {"none": 0.00, "A": 0.08, "S": 0.10, "both": 0.18}
        f_ratio = f_base + t_adj.get(training_type, 0.00)
        
        fat_change = -D_abs * f_ratio / 9  # kcal 转 g脂肪，1g脂肪约9 kcal
        
        return {
            "D": D_abs,
            "mode": "deficit",
            "ratio": f_ratio,
            "fat_change_g": fat_change
        }
    
    # === 情况2：盈余（增脂） ===
    else:
        if D <= 400:
            s_base = 0.50
        elif D <= 800:
            s_base = 0.65
        else:
            s_base = 0.80
        
        # 训练修正（盈余时）
        t_adj = {"none": 0.00, "A": -0.05, "S": -0.15, "both": -0.20}
        s_ratio = s_base + t_adj.get(training_type, 0.00)
        
        fat_change = D * s_ratio / 9
        
        return {
            "D": D,
            "mode": "surplus",
            "ratio": s_ratio,
            "fat_change_g": fat_change
        }

