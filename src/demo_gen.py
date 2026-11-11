import json, random, datetime as dt
random.seed(11)
hoy=dt.date(2026,10,28)
def d(x): return x.isoformat()
fincas=[{'id':'f1','nombre':'El Tesoro','propietario':'Ejemplo','vereda':'Ocamonte','municipio':'Ocamonte','departamento':'Santander','areaTotal':3,'altitud':1970}]
variedades=[{'id':'v1','nombre':'Castillo'},{'id':'v2','nombre':'Caturra'},{'id':'v3','nombre':'Cenicafé 1'}]
dis=lambda ori:{'distSurcos':1.5,'distPlantas':1,'relacion':1.6,'orientacion':ori,'pendiente':35,'trazado':'contorno'}
lotes=[{'id':'l1','fincaId':'f1','nombre':'Lote 1','codigo':'L1','variedadId':'v1','hectareas':'0.6','fechaSiembra':'2021-04-10','densidad':'6.467 plantas/ha','diseno':dis(10)},
       {'id':'l2','fincaId':'f1','nombre':'Lote 2','codigo':'L2','variedadId':'v2','hectareas':'0.4','fechaSiembra':'2019-05-02','densidad':'6.400 plantas/ha','diseno':dis(-15)},
       {'id':'l3','fincaId':'f1','nombre':'Lote 3','codigo':'L3','variedadId':'v3','hectareas':'0.8','fechaSiembra':'2022-03-20'},
       {'id':'l4','fincaId':'f1','nombre':'La Cañada','codigo':'LC','variedadId':'v1','hectareas':'0.5','fechaSiembra':'2020-09-15'}]
nom=['Ana Ríos','Luis Gómez','Rosa Pérez','Jairo Díaz','Marta Suárez','Pedro León','Nidia Cano']
trab=[{'id':'t%d'%i,'nombre':n,'tarifaPorKg':750 if i in (2,5) else 700} for i,n in enumerate(nom)]
skill={t['id']:random.uniform(0.75,1.25) for t in trab}
regs=[];ini=dt.date(2026,8,20)
x=ini;rid=0
while x<=hoy-dt.timedelta(days=1):
    if x.weekday()!=6:
        pico=max(0.25,1-abs((x-dt.date(2026,10,8)).days)/45)
        lot=['l1','l2','l3','l4'][(x.toordinal()//3)%4]
        for t in random.sample(trab,random.randint(4,7)):
            h=random.choice([7,7.5,8,8,8.5,9]); kg=round(h*9*skill[t['id']]*pico*random.uniform(.8,1.15),1)
            if kg<5: continue
            l=next(z for z in lotes if z['id']==lot); rid+=1
            regs.append({'id':'g%d'%rid,'fincaId':'f1','loteId':lot,'loteNombre':l['nombre'],'lote':l['nombre'],'finca':'El Tesoro','variedadId':l['variedadId'],'variedad':next(v['nombre'] for v in variedades if v['id']==l['variedadId']),'anio':2026,'tipo':'Principal','pasada':1+(x-ini).days//18,'fecha':d(x),'trabajadorId':t['id'],'recolector':t['nombre'],'horas':h,'kg':kg,'tarifa':t['tarifaPorKg']})
    x+=dt.timedelta(days=1)
benef=[];ventas=[];bid=0
sem=ini
while sem<hoy-dt.timedelta(days=3):
    fin=sem+dt.timedelta(days=6)
    for l in lotes:
        ce=sum(r['kg'] for r in regs if r['loteId']==l['id'] and d(sem)<=r['fecha']<=d(fin))
        if ce>20: bid+=1; benef.append({'id':'b%d'%bid,'loteId':l['id'],'fecha':d(min(fin+dt.timedelta(days=4),hoy-dt.timedelta(days=1))),'metodo':'Lavado','kgEntrada':round(ce,1),'kgSalida':round(ce/random.uniform(4.9,5.3),1)})
    sem=fin+dt.timedelta(days=1)
# ventas cada ~10 días del 85% del pergamino acumulado
stock=0;vid=0;last=ini
for b in sorted(benef,key=lambda z:z['fecha']):
    stock+=b['kgSalida']
    fb=dt.date.fromisoformat(b['fecha'])
    if (fb-last).days>=10 and stock>100:
        vid+=1;kgv=round(stock*0.85,1);stock-=kgv;last=fb
        ventas.append({'id':'v%d'%vid,'fecha':d(fb),'finca':'El Tesoro','lote':'','comprador':'Cooperativa (ejemplo)','kg':kgv,'precio':random.choice([17400,17650,17900,18100,18350])})
labores=[];lid=0
for f,l,tp,c in [('2026-08-28','l1','Control de malezas (guadaña)',164000),('2026-09-04','l3','Fertilización edáfica',1320000),('2026-09-15','l2','Fumigación — control de plagas',210000),('2026-09-29','l4','Control de malezas (guadaña)',123000),('2026-10-06','l1','Fertilización edáfica',985000),('2026-10-14','l3','Control de broca (repase)',246000),('2026-10-21','l2','Podas',164000)]:
    lid+=1;labores.append({'id':'lb%d'%lid,'loteId':l,'fecha':f,'tipo':tp,'insumo':'','cantidad':'','costo':c,'responsable':'Jorge Ruiz'})
insumos=[{'id':'i1','fecha':'2026-09-01','finca':'El Tesoro','lote':'','nombre':'Costales y lonas','costo':180000},{'id':'i2','fecha':'2026-10-02','finca':'El Tesoro','lote':'','nombre':'Combustible beneficiadero','costo':95000}]
empleados=[{'id':'e1','nombre':'Jorge Ruiz','cargo':'Mayordomo','contrato':'Término indefinido','fechaIngreso':'2024-01-15','salario':1750000}]
activos=[{'id':'a1','nombre':'Marquesina solar','categoria':'Infraestructura','fecha':'2025-09-01','costo':6200000,'vidaUtil':10,'valorResidual':0},{'id':'a2','nombre':'Despulpadora','categoria':'Maquinaria','fecha':'2023-02-10','costo':4500000,'vidaUtil':10,'valorResidual':500000}]
adelantos=[{'id':'ad1','trabajadorId':'t0','fecha':'2026-10-24','valor':50000,'motivo':'Mercado','aplicado':False}]
pagos=[]
ots=[]
def ot(n,f,l,tp,est,jor,ins,prio='Media',real=None):
    l_=next(z for z in lotes if z['id']==l); area=float(l_['hectareas'])
    mo=jor*82000; ic=sum(i['cantidad']*i['costoUnit'] for i in ins)
    o={'id':'o%d'%n,'numero':'OT-%04d'%n,'estado':est,'prioridad':prio,'fechaProgramada':f,'loteId':l,'area':area,'tipo':tp,'responsable':'Jorge Ruiz','trabajadores':2,'especificacion':'Ejemplo de especificación técnica.','herramientas':'','epp':'','insumos':ins,'presupuesto':{'jornales':jor,'manoObra':mo,'insumos':ic,'total':mo+ic,'valorJornal':65000,'alimentacion':17000}}
    if real: o['real']={'fecha':f,'jornales':real,'avance':100,'insumos':ins,'manoObra':real*82000,'insumosCosto':ic,'total':real*82000+ic}
    ots.append(o)
ot(1,'2026-10-06','l1','Fertilización edáfica','Cerrada',1.5,[{'nombre':'NPK 17-6-18','cantidad':270,'unidad':'kg','costoUnit':3250}],real=2)
ot(2,'2026-10-14','l3','Control de broca (repase)','Cerrada',3,[],real=3)
ot(3,'2026-10-21','l2','Podas','Cerrada',2,[],real=2)
ot(4,'2026-10-26','l4','Control de malezas (guadaña)','En ejecución',1.5,[{'nombre':'Gasolina','cantidad':1,'unidad':'galón','costoUnit':16500}],'Alta')
ot(5,'2026-10-28','l3','Fertilización foliar','Emitida',0.8,[{'nombre':'Fertilizante foliar','cantidad':2.4,'unidad':'litro','costoUnit':28000}])
ot(6,'2026-10-30','l1','Control de malezas (guadaña)','Programada',1.8,[{'nombre':'Gasolina','cantidad':1.2,'unidad':'galón','costoUnit':16500}])
ot(7,'2026-10-31','l2','Fumigación — control de plagas','Programada',1,[])
plantillas=json.load(open('plantillas_demo.json'))['plantillas']
demo={'fincas':fincas,'variedades':variedades,'lotes':lotes,'bloques':[],'trabajadores':trab,'empleados':empleados,'activos':activos,'registros':regs,'insumos':insumos,'ventas':ventas,'beneficios':benef,'labores':labores,'adelantos':adelantos,'pagos':pagos,'plantillas':plantillas,'ordenes':ots,'planConfig':{'valorJornal':65000,'alimentacion':17000},'muestreos':[],'marcasPlanta':[],'planesMuestreo':[],'mapaConfig':{},'bitacora':[]}
exec(open('demo_extra.py').read())
json.dump(demo,open('demo_base.json','w'),ensure_ascii=False)
print(len(regs),round(sum(r['kg'] for r in regs)),len(benef),len(ventas))
