"""Reproduz os dados e modelos a partir do ZIP oficial do F1DB."""
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile

import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, confusion_matrix, f1_score, precision_score,
                             recall_score, roc_auc_score, log_loss)
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("zip", type=Path)
archive = parser.parse_args().zip
assert hashlib.sha256(archive.read_bytes()).hexdigest() == "0760d50ecb9fad9f267e14ceece73891c2095c812a71d024d0cfbda1f02b3863"
with ZipFile(archive) as z:
    def table(name):
        return pd.read_csv(z.open(f"f1db-{name}.csv"), low_memory=False)
    races = table("races").set_index("id")
    results = table("races-race-results").query("2010 <= year <= 2025").copy()

starts = results.loc[~results.positionText.isin(["DNS", "DNQ", "DNP"])].copy()
starts["top10"] = starts.positionNumber.le(10).astype(int)
# Inclui largadas do pit lane na história de resultados.
for key, feature in [("driverId", "formaPiloto"), ("constructorId", "formaEquipe")]:
    history = starts.groupby(["year", key, "round"]).top10.agg(["sum", "count"])
    sums = history.groupby(level=[0,1]).transform(lambda x: x.shift().rolling(5,min_periods=1).sum())
    starts = starts.join((sums["sum"]/sums["count"]).rename(feature), on=["year",key,"round"])
df = starts.dropna(subset=["gridPositionNumber"]).copy()
df["circuito"] = df.raceId.map(races.circuitId)
df["gp"] = df.raceId.map(races.grandPrixId)
df = df.rename(columns={"year":"ano","round":"etapa","driverId":"piloto","constructorId":"equipe",
                        "gridPositionNumber":"grid","positionText":"chegada"})
df = df[["ano","etapa","gp","circuito","piloto","equipe","grid","formaPiloto","formaEquipe","chegada","top10"]].sort_values(["ano","etapa","grid"])
df["grid"] = df.grid.astype(int)
df.to_csv(ROOT/"dados/largadas.csv",index=False)
train, val, test = df.ano.le(2019), df.ano.between(2020,2022), df.ano.ge(2023)
summary = {}
for name, features in [("base",["grid"]),("historico",["grid","formaPiloto","formaEquipe"])]:
    X = df[features].fillna(0.5)
    def fit(c, mask):
        model = make_pipeline(StandardScaler(), LogisticRegression(C=c))
        return model.fit(X[mask],df.top10[mask])
    candidates = [0.01,0.1,1,10]
    best = min(candidates,key=lambda c: log_loss(df.top10[val],fit(c,train).predict_proba(X[val])[:,1]))
    model = fit(best, train|val)
    prob = model.predict_proba(X[test])[:,1]
    y = df.top10[test]
    labels = prob >= 0.5
    summary[name] = dict(C=best, acuracia=accuracy_score(y,labels), precisao=precision_score(y,labels),
                         recall=recall_score(y,labels), F1=f1_score(y,labels), AUC=roc_auc_score(y,prob),
                         matriz=confusion_matrix(y,labels).tolist())
    df.loc[test,name] = prob
print(df.groupby([train,val,test]).size().tolist(),len(df),summary)
(ROOT/"analise/metricas.json").write_text(json.dumps(summary,indent=2))
(ROOT/"docs/dados.js").write_text("const dados="+df.to_json(orient="records",double_precision=12)+";")
