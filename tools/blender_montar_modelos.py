# Script do Claude para o jogo "Sombra de Vila Rica" (claude-jogo-7)
# Monta os personagens e animações do Mixamo e exporta em .glb para o jogo.
# Como usar: no Blender, aba "Scripting" > abrir este arquivo > botão ▶ (Run Script).
import bpy, os, re, zipfile, traceback

D = os.path.join(os.path.expanduser('~'), 'Downloads')
OUT = os.path.join(D, 'claude-jogo-7-modelos')
TMP = os.path.join(OUT, '_fbx')
os.makedirs(TMP, exist_ok=True)
LOG = []
def L(*a):
    s = ' '.join(str(x) for x in a); LOG.append(s); print(s)
    with open(os.path.join(OUT, 'log.txt'), 'w', encoding='utf-8') as f: f.write('\n'.join(LOG))

PACOTES = {'Pro Sword and Shield Pack.zip': 'espada', 'Action Adventure Pack.zip': 'aventura',
           'Pro Melee Axe Pack.zip': 'machado', 'Lite Sword and Shield Pack.zip': 'guarda'}

PERSONAGENS = {
    'ines': os.path.join(D, 'Erika Archer.fbx'),
    'tome': os.path.join(TMP, 'machado', 'Knight D Pelegrini.fbx'),
    'guarda': os.path.join(TMP, 'guarda', 'castle_guard_01.fbx'),
}

ANIMACOES = {
    'aventura': {'idle': 'parado', 'walking': 'andar', 'running': 'correr', 'crouched sneaking right': 'furtivo',
                 'jumping up': 'pular', 'falling idle': 'caindo', 'falling to roll': 'rolar', 'hard landing': 'aterrissar',
                 'run to stop': 'frear', 'idle (3)': 'olhar'},
    'espada': {'sword and shield idle': 'espada_parado', 'sword and shield walk': 'espada_andar', 'sword and shield run': 'espada_correr',
               'sword and shield slash': 'golpe1', 'sword and shield slash (2)': 'golpe2', 'sword and shield attack': 'golpe3',
               'sword and shield kick': 'chute', 'sword and shield block idle': 'bloquear', 'sword and shield impact': 'dano',
               'sword and shield death': 'morrer', 'sword and shield jump': 'espada_pular', 'sword and shield crouch idle': 'agachado',
               'draw sword 1': 'sacar', 'sword and shield power up': 'vitoria'},
    'machado': {'standing melee attack downward': 'machado1', 'standing melee attack horizontal': 'machado2',
                'standing melee combo attack ver. 1': 'machado_combo', 'standing idle': 'machado_parado',
                'standing run forward': 'machado_correr', 'standing walk forward': 'machado_andar',
                'standing taunt battlecry': 'grito', 'standing react large gut': 'machado_dano'},
}

def limpar():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for col in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.images, bpy.data.actions, bpy.data.textures):
        for x in list(col):
            try: col.remove(x)
            except Exception: pass

def importar(caminho):
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=caminho)
    return [o for o in bpy.data.objects if o not in antes]

def curvas(act):
    try:
        return list(act.fcurves)
    except Exception:
        pass
    out = []
    for ly in getattr(act, 'layers', []):
        for st in ly.strips:
            for cb in st.channelbags: out += list(cb.fcurves)
    return out

def reduzir_texturas(lado=1024):
    for img in bpy.data.images:
        try:
            if img.size[0] > lado or img.size[1] > lado:
                img.scale(lado, lado)
        except Exception as e:
            L('  textura não reduzida', img.name, e)

def selecionar(objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]

def exportar(caminho, objs, animacoes):
    selecionar(objs)
    kw = dict(filepath=caminho, export_format='GLB', use_selection=True, export_skins=True, export_animations=animacoes,
              export_yup=True, export_image_format='JPEG', export_jpeg_quality=82)
    if animacoes:
        kw['export_animation_mode'] = 'NLA_TRACKS'
    try:
        bpy.ops.export_scene.gltf(**kw)
    except TypeError:
        kw.pop('export_jpeg_quality', None); kw.pop('export_image_format', None)
        bpy.ops.export_scene.gltf(**kw)

try:
    L('Blender', bpy.app.version_string)
    for z, nome in PACOTES.items():
        with zipfile.ZipFile(os.path.join(D, z)) as f: f.extractall(os.path.join(TMP, nome))
        L('extraído', z)

    # 1) Personagens (malha + esqueleto, sem animação)
    for nome, fbx in PERSONAGENS.items():
        limpar()
        objs = importar(fbx)
        for a in list(bpy.data.actions): bpy.data.actions.remove(a)
        for o in objs:
            if o.animation_data: o.animation_data_clear()
        reduzir_texturas(1024)
        exportar(os.path.join(OUT, nome + '.glb'), objs, False)
        L('personagem ok:', nome, len(objs), 'objetos')

    # 2) Animações: um esqueleto base com uma faixa (NLA) por animação
    limpar()
    base_objs = importar(PERSONAGENS['ines'])
    base = next(o for o in base_objs if o.type == 'ARMATURE')
    for o in base_objs:
        if o is not base: bpy.data.objects.remove(o, do_unlink=True)
    for a in list(bpy.data.actions): bpy.data.actions.remove(a)
    base.animation_data_create(); base.animation_data.action = None
    prefixo = re.match(r'(mixamorig\d*:)', base.data.bones[0].name)
    prefixo = prefixo.group(1) if prefixo else 'mixamorig:'
    L('prefixo dos ossos:', prefixo)

    total = 0
    for pacote, lista in ANIMACOES.items():
        for arquivo, chave in lista.items():
            caminho = os.path.join(TMP, pacote, arquivo + '.fbx')
            if not os.path.exists(caminho):
                L('  faltando:', caminho); continue
            objs = importar(caminho)
            arm = next((o for o in objs if o.type == 'ARMATURE'), None)
            act = arm.animation_data.action if arm and arm.animation_data else None
            if not act:
                L('  sem animação:', arquivo)
            else:
                act.name = chave; act.use_fake_user = True
                for fc in curvas(act):
                    fc.data_path = re.sub(r'mixamorig\d*:', prefixo, fc.data_path)
                faixa = base.animation_data.nla_tracks.new(); faixa.name = chave
                ini = int(act.frame_range[0])
                st = faixa.strips.new(chave, ini, act)
                try:
                    if getattr(act, 'slots', None) and len(act.slots): st.action_slot = act.slots[0]
                except Exception as e:
                    L('  slot:', e)
                total += 1
            for o in objs: bpy.data.objects.remove(o, do_unlink=True)
    L('animações:', total)
    exportar(os.path.join(OUT, 'animacoes.glb'), [base], True)
    L('PRONTO! Arquivos em', OUT)
except Exception:
    L('ERRO:\n' + traceback.format_exc())
