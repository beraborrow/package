# -*- coding: utf-8 -*-
"""Baseline vs Alternative V2 Copy

Automatically generated by Colaboratory.

Original file is located at
    https://colab.research.google.com/drive/1NNPdiKfO3950MuAGyIXTNrr4OMliINKb

# Parameters and Initialization
"""

import random
import numpy as np
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import matplotlib.pyplot as plt
import scipy.stats
from plotly.subplots import make_subplots

#policy functions
rate_issuance = 0.01
rate_redemption = 0.01
base_rate_initial = 0

#global variables
period = 24*365
month=24*30
day=24

#ibgt price
price_ibgt_initial = 1000
price_ibgt = [price_ibgt_initial]
sd_ibgt=0.02
drift_ibgt = 0

#POLLEN price & airdrop
price_POLLEN_initial = 1
price_POLLEN = [price_POLLEN_initial]
sd_POLLEN=0.005
drift_POLLEN = 0.0035
#reduced for now. otherwise the initial return too high
quantity_POLLEN_airdrop = 500
supply_POLLEN=[0]
POLLEN_total_supply=100000000

#PE ratio
PE_ratio = 50

#natural rate
natural_rate_initial = 0.2
natural_rate = [natural_rate_initial]
sd_natural_rate=0.002

#stability pool
initial_return=0.2
return_stability=[initial_return]
sd_return=0.001
sd_stability=0.001
drift_stability=1.002
theta=0.001

#liquidity pool & redemption pool
sd_liquidity=0.001
sd_redemption=0.001
drift_liquidity=1.0003
redemption_star = 0.8
delta = -20

#close troves
sd_closetroves=0.5
#sensitivity to NECT price
beta = 0.2

#open troves
distribution_parameter1_ibgt_quantity=10
distribution_parameter2_ibgt_quantity=500
distribution_parameter1_CR = 1.1
distribution_parameter2_CR = 0.1
distribution_parameter3_CR = 16
distribution_parameter1_inattention = 4
distribution_parameter2_inattention = 0.08
sd_opentroves=0.5
n_steady=0.5
initial_open=10

#sensitivity to NECT price & issuance fee
alpha = 0.3

#number of runs in simulation
n_sim= 8640

"""# Exogenous Factors

iBGT Price
"""

#ibgt price
for i in range(1, period):
  random.seed(2019375+10000*i)
  shock_ibgt = random.normalvariate(0,sd_ibgt)
  price_ibgt.append(price_ibgt[i-1]*(1+shock_ibgt)*(1+drift_ibgt))

"""Natural Rate"""

#natural rate
for i in range(1, period):
  random.seed(201597+10*i)
  shock_natural = random.normalvariate(0,sd_natural_rate)
  natural_rate.append(natural_rate[i-1]*(1+shock_natural))

"""POLLEN Price - First Month"""

#POLLEN price
for i in range(1, month):
  random.seed(2+13*i)
  shock_POLLEN = random.normalvariate(0,sd_POLLEN)  
  price_POLLEN.append(price_POLLEN[i-1]*(1+shock_POLLEN)*(1+drift_POLLEN))

"""# Troves

Liquidate Troves
"""

def liquidate_troves(troves, index, data):
  troves['CR_current'] = troves['iBGT_Price']*troves['iBGT_Quantity']/troves['Supply']
  price_NECT_previous = data.loc[index-1,'Price_NECT']
  price_POLLEN_previous = data.loc[index-1,'price_POLLEN']
  stability_pool_previous = data.loc[index-1, 'stability']

  troves_liquidated = troves[troves.CR_current < 1.1]
  troves = troves[troves.CR_current >= 1.1]
  debt_liquidated = troves_liquidated['Supply'].sum()
  ibgt_liquidated = troves_liquidated['iBGT_Quantity'].sum()
  n_liquidate = troves_liquidated.shape[0]
  troves = troves.reset_index(drop = True)

  liquidation_gain = ibgt_liquidated*price_ibgt_current - debt_liquidated*price_NECT_previous
  airdrop_gain = price_POLLEN_previous * quantity_POLLEN_airdrop
  
  np.random.seed(2+index)
  shock_return = np.random.normal(0,sd_return)
  if index <= day:
   return_stability = initial_return*(1+shock_return)
  elif index<=month:
    #min function to rule out the large fluctuation caused by the large but temporary liquidation gain in a particular period
    return_stability = min(0.5, 365*(data.loc[index-day:index, 'liquidation_gain'].sum()+data.loc[index-day:index, 'airdrop_gain'].sum())/(price_NECT_previous*stability_pool_previous))
  else:
    return_stability = (365/30)*(data.loc[index-month:index, 'liquidation_gain'].sum()+data.loc[index-month:index, 'airdrop_gain'].sum())/(price_NECT_previous*stability_pool_previous)
  
  return[troves, return_stability, debt_liquidated, ibgt_liquidated, liquidation_gain, airdrop_gain, n_liquidate]

"""Close Troves"""

def close_troves(troves, index2, price_NECT_previous):
  np.random.seed(208+index2)
  shock_closetroves = np.random.normal(0,sd_closetroves)
  n_troves = troves.shape[0]

  if index2 <= 240:
    number_closetroves = np.random.uniform(0,1)
  elif price_NECT_previous >=1:
    number_closetroves = max(0, n_steady * (1+shock_closetroves))
  else:
    number_closetroves = max(0, n_steady * (1+shock_closetroves)) + beta*(1-price_NECT_previous)*n_troves
  
  number_closetroves = int(round(number_closetroves))
  
  random.seed(293+100*index2)
  drops = list(random.sample(range(len(troves)), number_closetroves))
  troves = troves.drop(drops)
  troves = troves.reset_index(drop=True)
  if len(troves) < number_closetroves:
    number_closetroves = -999

  return[troves, number_closetroves]

"""Adjust Troves"""

def adjust_troves(troves, index):
  issuance_NECT_adjust = 0
  random.seed(57984-3*index)
  ratio = random.uniform(0,1)
  for i in range(0, troves.shape[0]):
    random.seed(187*index + 3*i)
    working_trove = troves.iloc[i,:]
    p = random.uniform(0,1)
    check = (working_trove['CR_current']-working_trove['CR_initial'])/(working_trove['CR_initial']*working_trove['Rational_inattention'])

  #A part of the troves are adjusted by adjusting debt
    if p >= ratio:
      if check<-1:
        working_trove['Supply'] = working_trove['iBGT_Price']*working_trove['iBGT_Quantity']/working_trove['CR_initial']
      if check>2:
        supply_new = working_trove['iBGT_Price']*working_trove['iBGT_Quantity']/working_trove['CR_initial']
        issuance_NECT_adjust = issuance_NECT_adjust + rate_issuance * (supply_new - working_trove['Supply'])
        working_trove['Supply'] = supply_new
  #Another part of the troves are adjusted by adjusting collaterals
    if p < ratio and (check < -1 or check > 2):
      working_trove['iBGT_Quantity'] = working_trove['CR_initial']*working_trove['Supply']/working_trove['iBGT_Price']
    
    troves.loc[i] = working_trove
  return[troves, issuance_NECT_adjust]

"""Open Troves"""

def open_troves(troves, index1, price_NECT_previous):
  random.seed(2019*index1)  
  issuance_NECT_open = 0
  shock_opentroves = random.normalvariate(0,sd_opentroves)
  n_troves = troves.shape[0]

  if index1<=0:
    number_opentroves = initial_open
  elif price_NECT_previous <=1 + rate_issuance:
    number_opentroves = max(0, n_steady * (1+shock_opentroves))
  else:
    number_opentroves = max(0, n_steady * (1+shock_opentroves)) + alpha*(price_NECT_previous-rate_issuance-1)*n_troves
  
  number_opentroves = int(round(float(number_opentroves)))

  for i in range(0, number_opentroves):
    price_ibgt_current = price_ibgt[index1]
    
    np.random.seed(2033 + index1 + i*i)
    CR_ratio = distribution_parameter1_CR + distribution_parameter2_CR * np.random.chisquare(df=distribution_parameter3_CR)
    
    np.random.seed(20 + 10 * i + index1)
    quantity_ibgt = np.random.gamma(distribution_parameter1_ibgt_quantity, scale=distribution_parameter2_ibgt_quantity)
    
    np.random.seed(209870- index1 + i*i)
    rational_inattention = np.random.gamma(distribution_parameter1_inattention, scale=distribution_parameter2_inattention)
    
    supply_trove = price_ibgt_current * quantity_ibgt / CR_ratio
    issuance_NECT_open = issuance_NECT_open + rate_issuance * supply_trove

    new_row = {"iBGT_Price": price_ibgt_current, "iBGT_Quantity": quantity_ibgt, 
               "CR_initial": CR_ratio, "Supply": supply_trove, 
               "Rational_inattention": rational_inattention, "CR_current": CR_ratio}
    troves = troves.append(new_row, ignore_index=True)

  return[troves, number_opentroves, issuance_NECT_open]

"""# NECT Market

Stability Pool
"""

def stability_update(stability_pool_previous, return_previous, index):
  np.random.seed(27+3*index)
  shock_stability = np.random.normal(0,sd_stability)
  natural_rate_current = natural_rate[index]
  if index <= month:
    stability_pool = stability_pool_previous* (drift_stability+shock_stability)* (1+ return_previous- natural_rate_current)**theta
  else:
    stability_pool = stability_pool_previous* (1+shock_stability)* (1+ return_previous- natural_rate_current)**theta
  return[stability_pool]

"""NECT Price, liquidity pool, and redemption"""

def price_stabilizer(troves, index, data, stability_pool, n_open):
  issuance_NECT_stabilizer = 0
  redemption_fee = 0
  n_redempt = 0
  redempted = 0
  redemption_pool = 0  
#Calculating Price
  supply = troves['Supply'].sum()
  np.random.seed(20*index)
  shock_liquidity = np.random.normal(0,sd_liquidity)
  liquidity_pool_previous = float(data['liquidity'][index-1])
  price_NECT_previous = float(data['Price_NECT'][index-1])
  price_NECT_current= price_NECT_previous*((supply-stability_pool)/(liquidity_pool_previous*(drift_liquidity+shock_liquidity)))**(1/delta)
  

#Liquidity Pool
  liquidity_pool = supply-stability_pool

#Stabilizer
  #Ceiling Arbitrageurs
  if price_NECT_current > 1.1 + rate_issuance:
    #supply_current = sum(troves['Supply'])
    supply_wanted=stability_pool+liquidity_pool_previous*(drift_liquidity+shock_liquidity)*((1.1+rate_issuance)/price_NECT_previous)**delta
    supply_trove = supply_wanted - supply

    CR_ratio = 1.1
    rational_inattention = 0.1
    quantity_ibgt = supply_trove * CR_ratio / price_ibgt_current
    issuance_NECT_stabilizer = rate_issuance * supply_trove

    new_row = {"iBGT_Price": price_ibgt_current, "iBGT_Quantity": quantity_ibgt, "CR_initial": CR_ratio,
               "Supply": supply_trove, "Rational_inattention": rational_inattention, "CR_current": CR_ratio}
    troves = troves.append(new_row, ignore_index=True)
    price_NECT_current = 1.1 + rate_issuance
    #missing in the previous version  
    liquidity_pool = supply_wanted-stability_pool
    n_open=n_open+1
    

  #Floor Arbitrageurs
  if price_NECT_current < 1 - rate_redemption:
    np.random.seed(30*index)
    shock_redemption = np.random.normal(0,sd_redemption)
    redemption_ratio = redemption_star * (1+shock_redemption)

    #supply_current = sum(troves['Supply'])
    supply_target=stability_pool+liquidity_pool_previous*(drift_liquidity+shock_liquidity)*((1-rate_redemption)/price_NECT_previous)**delta
    supply_diff = supply - supply_target
    if supply_diff < redemption_ratio * liquidity_pool:
      redemption_pool=supply_diff
      #liquidity_pool = liquidity_pool - redemption_pool
      price_NECT_current = 1 - rate_redemption
    else:
      redemption_pool=redemption_ratio * liquidity_pool
      #liquidity_pool = (1-redemption_ratio)*liquidity_pool
      price_NECT_current= price_NECT_previous * (liquidity_pool/(liquidity_pool_previous*(drift_liquidity+shock_liquidity)))**(1/delta)
    
    #Shutting down the riskiest troves
    troves = troves.sort_values(by='CR_current', ascending = True)
    quantity_working_trove = troves['Supply'][troves.index[0]]
    redempted = quantity_working_trove
    while redempted <= redemption_pool:
      troves = troves.drop(troves.index[0])
      quantity_working_trove = troves['Supply'][troves.index[0]]
      redempted = redempted + quantity_working_trove
      n_redempt = n_redempt + 1
    
    #Residuals
    redempted = redempted - quantity_working_trove
    residual = redemption_pool - redempted
    wk = troves.index[0]
    troves['Supply'][wk] = troves['Supply'][wk] - residual
    troves['iBGT_Quantity'][wk] = troves['iBGT_Quantity'][wk] - residual/price_ibgt_current
    troves['CR_current'][wk] = price_ibgt_current * troves['iBGT_Quantity'][wk] / troves['Supply'][wk]

    #Redemption Fee
    redemption_fee = rate_redemption * redemption_pool
    

  troves = troves.reset_index(drop=True)
  return[price_NECT_current, liquidity_pool, troves, issuance_NECT_stabilizer, redemption_fee, n_redempt, redemption_pool, n_open]

"""# POLLEN Market"""



def POLLEN_market(index, data):
  quantity_POLLEN = (100000000/3)*(1-0.5**(index/period))
  np.random.seed(2+3*index)
  if index <= month: 
    price_POLLEN_current = price_POLLEN[index-1]
    annualized_earning = (index/month)**0.5*np.random.normal(200000000,500000)
  else:
    revenue_issuance = data.loc[index-month:index, 'issuance_fee'].sum()
    revenue_redemption = data.loc[index-month:index, 'redemption_fee'].sum()
    annualized_earning = 365*(revenue_issuance+revenue_redemption)/30
    #discountin factor to factor in the risk in early days
    discount=index/period
    price_POLLEN_current = discount*PE_ratio*annualized_earning/POLLEN_total_supply
  
  MC_POLLEN_current = price_POLLEN_current * quantity_POLLEN
  return[price_POLLEN_current, annualized_earning, MC_POLLEN_current]

"""# Simulation Program"""

#Defining Initials
initials = {"Price_NECT":[1.00], "Price_iBGT":[price_ibgt_initial], "n_open":[initial_open], "n_close":[0], "n_liquidate": [0], "n_redempt":[0], 
            "n_troves":[initial_open], "stability":[0], "liquidity":[0], "redemption_pool":[0],
            "supply_NECT":[0],  "return_stability":[initial_return], "airdrop_gain":[0], "liquidation_gain":[0],  "issuance_fee":[0], "redemption_fee":[0],
            "price_POLLEN":[price_POLLEN_initial], "MC_POLLEN":[0], "annualized_earning":[0]}
data = pd.DataFrame(initials)
troves= pd.DataFrame({"iBGT_Price":[], "iBGT_Quantity":[], "CR_initial":[], 
              "Supply":[], "Rational_inattention":[], "CR_current":[]})
result_open = open_troves(troves, 0, data['Price_NECT'][0])
troves = result_open[0]
issuance_NECT_open = result_open[2]
data.loc[0,'issuance_fee'] = issuance_NECT_open * initials["Price_NECT"][0]
data.loc[0,'supply_NECT'] = troves["Supply"].sum()
data.loc[0,'liquidity'] = 0.5*troves["Supply"].sum()
data.loc[0,'stability'] = 0.5*troves["Supply"].sum()

#Simulation Process
for index in range(1, n_sim):
#exogenous ibgt price input
  price_ibgt_current = price_ibgt[index]
  troves['iBGT_Price'] = price_ibgt_current
  price_NECT_previous = data.loc[index-1,'Price_NECT']
  price_POLLEN_previous = data.loc[index-1,'price_POLLEN']

#trove liquidation & return of stability pool
  result_liquidation = liquidate_troves(troves, index, data)
  troves = result_liquidation[0]
  return_stability = result_liquidation[1]
  debt_liquidated = result_liquidation[2]
  ibgt_liquidated = result_liquidation[3]
  liquidation_gain = result_liquidation[4]
  airdrop_gain = result_liquidation[5]
  n_liquidate = result_liquidation[6]

#close troves
  result_close = close_troves(troves, index, price_NECT_previous)
  troves = result_close[0]
  n_close = result_close[1]
  #if n_close<0:
  #  break

#adjust troves
  result_adjustment = adjust_troves(troves, index)
  troves = result_adjustment[0]
  issuance_NECT_adjust = result_adjustment[1]

#open troves
  result_open = open_troves(troves, index, price_NECT_previous)
  troves = result_open[0]
  n_open = result_open[1]  
  issuance_NECT_open = result_open[2]

#Stability Pool
  stability_pool = stability_update(data.loc[index-1,'stability'], return_stability, index)[0]

#Calculating Price, Liquidity Pool, and Redemption
  result_price = price_stabilizer(troves, index, data, stability_pool, n_open)
  price_NECT_current = result_price[0]
  liquidity_pool = result_price[1]
  troves = result_price[2]
  issuance_NECT_stabilizer = result_price[3]
  redemption_fee = result_price[4]
  n_redempt = result_price[5]
  redemption_pool = result_price[6]
  n_open=result_price[7]
  if liquidity_pool<0:
    break

#POLLEN Market
  result_POLLEN = POLLEN_market(index, data)
  price_POLLEN_current = result_POLLEN[0]
  annualized_earning = result_POLLEN[1]
  MC_POLLEN_current = result_POLLEN[2]

#Summary
  issuance_fee = price_NECT_current * (issuance_NECT_adjust + issuance_NECT_open + issuance_NECT_stabilizer)
  n_troves = troves.shape[0]
  supply_NECT = troves['Supply'].sum()
  if index >= month:
    price_POLLEN.append(price_POLLEN_current)

  new_row = {"Price_NECT":float(price_NECT_current), "Price_iBGT":float(price_ibgt_current), "n_open":float(n_open), "n_close":float(n_close), 
             "n_liquidate":float(n_liquidate), "n_redempt": float(n_redempt), "n_troves":float(n_troves),
              "stability":float(stability_pool), "liquidity":float(liquidity_pool), "redemption_pool":float(redemption_pool), "supply_NECT":float(supply_NECT),
             "issuance_fee":float(issuance_fee), "redemption_fee":float(redemption_fee),
             "airdrop_gain":float(airdrop_gain), "liquidation_gain":float(liquidation_gain), "return_stability":float(return_stability), 
             "annualized_earning":float(annualized_earning), "MC_POLLEN":float(MC_POLLEN_current), "price_POLLEN":float(price_POLLEN_current)
             }
  data = data.append(new_row, ignore_index=True)
  if price_NECT_current < 0:
    break

"""#**Exhibition**"""

data

def linevis(data, measure):
  fig = px.line(data, x=data.index/720, y=measure, title= measure+' dynamics')
  fig.show()

fig = make_subplots(specs=[[{"secondary_y": True}]])
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['Price_NECT'], name="NECT Price"),
    secondary_y=False,
)
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['Price_iBGT'], name="iBGT Price"),
    secondary_y=True,
)
fig.update_layout(
    title_text="Price Dynamics of NECT and iBGT"
)
fig.update_xaxes(tick0=0, dtick=1, title_text="Month")
fig.update_yaxes(title_text="NECT Price", secondary_y=False)
fig.update_yaxes(title_text="iBGT Price", secondary_y=True)
fig.show()

fig = make_subplots(specs=[[{"secondary_y": True}]])
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['n_troves'], name="Number of Troves"),
    secondary_y=False,
)
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['supply_NECT'], name="NECT Supply"),
    secondary_y=True,
)
fig.update_layout(
    title_text="Dynamics of Trove Numbers and NECT Supply"
)
fig.update_xaxes(tick0=0, dtick=1, title_text="Month")
fig.update_yaxes(title_text="Number of Troves", secondary_y=False)
fig.update_yaxes(title_text="NECT Supply", secondary_y=True)
fig.show()

fig = make_subplots(rows=2, cols=1)
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['n_open'], name="Number of Troves Opened", mode='markers'),
    row=1, col=1, secondary_y=False
)
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['n_close'], name="Number of Troves Closed", mode='markers'),
    row=2, col=1, secondary_y=False
)
fig.update_layout(
    title_text="Dynamics of Number of Troves Opened and Closed"
)
fig.update_xaxes(tick0=0, dtick=1, title_text="Month")
fig.update_yaxes(title_text="Troves Opened", row=1, col=1)
fig.update_yaxes(title_text="Troves Closed", row=2, col=1)
fig.show()

fig = make_subplots(specs=[[{"secondary_y": True}]])
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['n_liquidate'], name="Number of Liquidated Troves", mode='markers'),
    secondary_y=False,
)
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['n_redempt'], name="Number of Redempted Troves", mode='markers'),
    secondary_y=False,
)
fig.update_layout(
    title_text="Dynamics of Number of Liquidated and Redempted Troves"
)
fig.update_xaxes(tick0=0, dtick=1, title_text="Month")
fig.update_yaxes(title_text="Number of Liquidated Troves", secondary_y=False)
fig.update_yaxes(title_text="Number of Redempted Troves", secondary_y=True)
fig.show()

fig = make_subplots(specs=[[{"secondary_y": True}]])
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['liquidity'], name="Liquidity Pool"),
    secondary_y=False,
)
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['stability'], name="Stability Pool"),
    secondary_y=False,
)
fig.add_trace(
    go.Scatter(x=data.index/720, y=100*data['redemption_pool'], name="100*Redemption Pool"),
    secondary_y=False,
)
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['return_stability'], name="Return of Stability Pool"),
    secondary_y=True,
)
fig.update_layout(
    title_text="Dynamics of Liquidity, Stability, Redemption Pools and Return of Stability Pool"
)
fig.update_xaxes(tick0=0, dtick=1, title_text="Month")
fig.update_yaxes(title_text="Size of Pools", secondary_y=False)
fig.update_yaxes(title_text="Return", secondary_y=True)
fig.show()

fig = make_subplots(specs=[[{"secondary_y": True}]])
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['airdrop_gain'], name="Airdrop Gain"),
    secondary_y=False,
)
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['liquidation_gain'], name="Liquidation Gain"),
    secondary_y=True,
)
fig.update_layout(
    title_text="Dynamics of Airdrop and Liquidation Gain"
)
fig.update_xaxes(tick0=0, dtick=1, title_text="Month")
fig.update_yaxes(title_text="Airdrop Gain", secondary_y=False)
fig.update_yaxes(title_text="Liquidation Gain", secondary_y=True)
fig.show()

fig = make_subplots(specs=[[{"secondary_y": True}]])
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['issuance_fee'], name="Issuance Fee"),
    secondary_y=False,
)
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['redemption_fee'], name="Redemption Fee"),
    secondary_y=True,
)
fig.update_layout(
    title_text="Dynamics of Issuance Fee and Redemption Fee"
)
fig.update_xaxes(tick0=0, dtick=1, title_text="Month")
fig.update_yaxes(title_text="Issuance Fee", secondary_y=False)
fig.update_yaxes(title_text="Redemption Fee", secondary_y=True)
fig.show()

#linevis(data, 'annualized_earning')

fig = make_subplots(specs=[[{"secondary_y": True}]])
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['price_POLLEN'], name="POLLEN Price"),
    secondary_y=False,
)
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['MC_POLLEN'], name="POLLEN Market Cap"),
    secondary_y=True,
)
fig.update_layout(
    title_text="Dynamics of the Price and Market Cap of POLLEN"
)
fig.update_xaxes(tick0=0, dtick=1, title_text="Month")
fig.update_yaxes(title_text="POLLEN Price", secondary_y=False)
fig.update_yaxes(title_text="POLLEN Market Cap", secondary_y=True)
fig.show()

def trove_histogram(measure):
  fig = px.histogram(troves, x=measure, title='Distribution of '+measure, nbins=25)
  fig.show()

troves

trove_histogram('iBGT_Quantity')
trove_histogram('CR_initial')
trove_histogram('Supply')
trove_histogram('Rational_inattention')
trove_histogram('CR_current')

import matplotlib.pyplot as plt
plt.plot(troves["iBGT_Quantity"])
plt.show()

plt.plot(troves["CR_initial"])
plt.show()

plt.plot(troves["Supply"])
plt.show()

plt.plot(troves["CR_current"])
plt.show()

data.describe()

"""new policy function

issuance fee = redemption fee = base rate

#**Simulation with Policy Function**
"""

#Defining Initials
initials = {"Price_NECT":[1.00], "Price_iBGT":[price_ibgt_initial], "n_open":[initial_open], "n_close":[0], "n_liquidate": [0], "n_redempt":[0], 
            "n_troves":[initial_open], "stability":[0], "liquidity":[0], "redemption_pool":[0],
            "supply_NECT":[0],  "return_stability":[initial_return], "airdrop_gain":[0], "liquidation_gain":[0],  "issuance_fee":[0], "redemption_fee":[0],
            "price_POLLEN":[price_POLLEN_initial], "MC_POLLEN":[0], "annualized_earning":[0], "base_rate":[base_rate_initial]}
data2 = pd.DataFrame(initials)
troves2= pd.DataFrame({"iBGT_Price":[], "iBGT_Quantity":[], "CR_initial":[], 
              "Supply":[], "Rational_inattention":[], "CR_current":[]})
result_open = open_troves(troves2, 0, data2['Price_NECT'][0])
troves2 = result_open[0]
issuance_NECT_open = result_open[2]
data2.loc[0,'issuance_fee'] = issuance_NECT_open * initials["Price_NECT"][0]
data2.loc[0,'supply_NECT'] = troves2["Supply"].sum()
data2.loc[0,'liquidity'] = 0.5*troves2["Supply"].sum()
data2.loc[0,'stability'] = 0.5*troves2["Supply"].sum()

#Simulation Process
for index in range(1, n_sim):
#exogenous ibgt price input
  price_ibgt_current = price_ibgt[index]
  troves2['iBGT_Price'] = price_ibgt_current
  price_NECT_previous = data2.loc[index-1,'Price_NECT']
  price_POLLEN_previous = data2.loc[index-1,'price_POLLEN']

#policy function determines base rate
  base_rate_current = 0.98 * data2.loc[index-1,'base_rate'] + 0.5*(data2.loc[index-1,'redemption_pool']/troves2['Supply'].sum())
  rate_issuance = base_rate_current
  rate_redemption = base_rate_current

#trove liquidation & return of stability pool
  result_liquidation = liquidate_troves(troves2, index, data2)
  troves2 = result_liquidation[0]
  return_stability = result_liquidation[1]
  debt_liquidated = result_liquidation[2]
  ibgt_liquidated = result_liquidation[3]
  liquidation_gain = result_liquidation[4]
  airdrop_gain = result_liquidation[5]
  n_liquidate = result_liquidation[6]

#close troves
  result_close = close_troves(troves2, index, price_NECT_previous)
  troves2 = result_close[0]
  n_close = result_close[1]
  #if n_close<0:
  #  break

#adjust troves
  result_adjustment = adjust_troves(troves2, index)
  troves2 = result_adjustment[0]
  issuance_NECT_adjust = result_adjustment[1]

#open troves
  result_open = open_troves(troves2, index, price_NECT_previous)
  troves2 = result_open[0]
  n_open = result_open[1]  
  issuance_NECT_open = result_open[2]

#Stability Pool
  stability_pool = stability_update(data2.loc[index-1,'stability'], return_stability, index)[0]

#Calculating Price, Liquidity Pool, and Redemption
  result_price = price_stabilizer(troves2, index, data2, stability_pool, n_open)
  price_NECT_current = result_price[0]
  liquidity_pool = result_price[1]
  troves2 = result_price[2]
  issuance_NECT_stabilizer = result_price[3]
  redemption_fee = result_price[4]
  n_redempt = result_price[5]
  redemption_pool = result_price[6]
  n_open=result_price[7]
  if liquidity_pool<0:
    break

#POLLEN Market
  result_POLLEN = POLLEN_market(index, data2)
  price_POLLEN_current = result_POLLEN[0]
  annualized_earning = result_POLLEN[1]
  MC_POLLEN_current = result_POLLEN[2]

#Summary
  issuance_fee = price_NECT_current * (issuance_NECT_adjust + issuance_NECT_open + issuance_NECT_stabilizer)
  n_troves = troves2.shape[0]
  supply_NECT = troves2['Supply'].sum()
  if index >= month:
    price_POLLEN.append(price_POLLEN_current)

  new_row = {"Price_NECT":float(price_NECT_current), "Price_iBGT":float(price_ibgt_current), "n_open":float(n_open), "n_close":float(n_close), 
             "n_liquidate":float(n_liquidate), "n_redempt": float(n_redempt), "n_troves":float(n_troves),
              "stability":float(stability_pool), "liquidity":float(liquidity_pool), "redemption_pool":float(redemption_pool), "supply_NECT":float(supply_NECT),
             "issuance_fee":float(issuance_fee), "redemption_fee":float(redemption_fee),
             "airdrop_gain":float(airdrop_gain), "liquidation_gain":float(liquidation_gain), "return_stability":float(return_stability), 
             "annualized_earning":float(annualized_earning), "MC_POLLEN":float(MC_POLLEN_current), "price_POLLEN":float(price_POLLEN_current), 
             "base_rate":float(base_rate_current)}
  data2 = data2.append(new_row, ignore_index=True)
  if price_NECT_current < 0:
    break

data2

"""#**Exhibition Part 2**"""

fig = make_subplots(specs=[[{"secondary_y": True}]])
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['Price_NECT'], name="NECT Price"),
    secondary_y=False,
)
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['Price_iBGT'], name="iBGT Price"),
    secondary_y=True,
)
fig.add_trace(
    go.Scatter(x=data2.index/720, y=data2['Price_NECT'], name="NECT Price New", line = dict(dash='dot')),
    secondary_y=False,
)
fig.update_layout(
    title_text="Price Dynamics of NECT and iBGT"
)
fig.update_xaxes(tick0=0, dtick=1, title_text="Month")
fig.update_yaxes(title_text="NECT Price", secondary_y=False)
fig.update_yaxes(title_text="iBGT Price", secondary_y=True)
fig.show()

fig = make_subplots(specs=[[{"secondary_y": True}]])
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['n_troves'], name="Number of Troves"),
    secondary_y=False,
)
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['supply_NECT'], name="NECT Supply"),
    secondary_y=True,
)
fig.add_trace(
    go.Scatter(x=data2.index/720, y=data2['n_troves'], name="Number of Troves New", line = dict(dash='dot')),
    secondary_y=False,
)
fig.add_trace(
    go.Scatter(x=data2.index/720, y=data2['supply_NECT'], name="NECT Supply New", line = dict(dash='dot')),
    secondary_y=True,
)
fig.update_layout(
    title_text="Dynamics of Trove Numbers and NECT Supply"
)
fig.update_xaxes(tick0=0, dtick=1, title_text="Month")
fig.update_yaxes(title_text="Number of Troves", secondary_y=False)
fig.update_yaxes(title_text="NECT Supply", secondary_y=True)
fig.show()

fig = make_subplots(rows=2, cols=2)
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['n_open'], name="Number of Troves Opened", mode='markers'),
    row=1, col=1, secondary_y=False
)
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['n_close'], name="Number of Troves Closed", mode='markers'),
    row=2, col=1, secondary_y=False
)
fig.add_trace(
    go.Scatter(x=data2.index/720, y=data2['n_open'], name="Number of Troves Opened New", mode='markers'),
    row=1, col=2, secondary_y=False
)
fig.add_trace(
    go.Scatter(x=data2.index/720, y=data2['n_close'], name="Number of Troves Closed New", mode='markers'),
    row=2, col=2, secondary_y=False
)
fig.update_layout(
    title_text="Dynamics of Number of Troves Opened and Closed"
)
fig.update_xaxes(tick0=0, dtick=1, title_text="Month")
fig.update_yaxes(title_text="Troves Opened", row=1, col=1)
fig.update_yaxes(title_text="Troves Closed", row=2, col=1)
fig.show()

fig = make_subplots(rows=2, cols=1)
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['n_liquidate'], name="Number of Liquidated Troves"),
    row=1, col=1, secondary_y=False
)
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['n_redempt'], name="Number of Redempted Troves"),
    row=2, col=1, secondary_y=False
)
fig.add_trace(
    go.Scatter(x=data2.index/720, y=data2['n_liquidate'], name="Number of Liquidated Troves New", line = dict(dash='dot')),
    row=1, col=1, secondary_y=False
)
fig.add_trace(
    go.Scatter(x=data2.index/720, y=data2['n_redempt'], name="Number of Redempted Troves New", line = dict(dash='dot')),
    row=2, col=1, secondary_y=False
)
fig.update_layout(
    title_text="Dynamics of Number of Liquidated and Redempted Troves"
)
fig.update_xaxes(tick0=0, dtick=1, title_text="Month")
fig.update_yaxes(title_text="Troves Liquidated", row=1, col=1)
fig.update_yaxes(title_text="Troves Redempted", row=2, col=1)
fig.show()

fig = make_subplots(specs=[[{"secondary_y": True}]])
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['liquidity'], name="Liquidity Pool"),
    secondary_y=False,
)
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['stability'], name="Stability Pool"),
    secondary_y=False,
)
fig.add_trace(
    go.Scatter(x=data.index/720, y=100*data['redemption_pool'], name="100*Redemption Pool"),
    secondary_y=False,
)
fig.add_trace(
    go.Scatter(x=data2.index/720, y=data2['liquidity'], name="Liquidity Pool New", line = dict(dash='dot')),
    secondary_y=False,
)
fig.add_trace(
    go.Scatter(x=data2.index/720, y=data2['stability'], name="Stability Pool New", line = dict(dash='dot')),
    secondary_y=False,
)
fig.add_trace(
    go.Scatter(x=data2.index/720, y=100*data2['redemption_pool'], name="100*Redemption Pool New", line = dict(dash='dot')),
    secondary_y=False,
)
fig.update_layout(
    title_text="Dynamics of Liquidity, Stability, Redemption Pools and Return of Stability Pool"
)
fig.update_xaxes(tick0=0, dtick=1, title_text="Month")
fig.update_yaxes(title_text="Size of Pools", secondary_y=False)
fig.show()

fig = make_subplots(specs=[[{"secondary_y": True}]])
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['return_stability'], name="Return of Stability Pool"),
    secondary_y=False,
)
fig.add_trace(
    go.Scatter(x=data2.index/720, y=data2['return_stability'], name="Return of Stability Pool New", line = dict(dash='dot')),
    secondary_y=False,
)
fig.update_layout(
    title_text="Dynamics of Liquidity, Stability, Redemption Pools and Return of Stability Pool"
)
fig.update_xaxes(tick0=0, dtick=1, title_text="Month")
fig.update_yaxes(title_text="Return", secondary_y=False)
fig.show()

fig = make_subplots(specs=[[{"secondary_y": True}]])
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['airdrop_gain'], name="Airdrop Gain"),
    secondary_y=False,
)
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['liquidation_gain'], name="Liquidation Gain"),
    secondary_y=True,
)
fig.add_trace(
    go.Scatter(x=data2.index/720, y=data2['airdrop_gain'], name="Airdrop Gain New", line = dict(dash='dot')),
    secondary_y=False,
)
fig.add_trace(
    go.Scatter(x=data2.index/720, y=data2['liquidation_gain'], name="Liquidation Gain New", line = dict(dash='dot')),
    secondary_y=True,
)
fig.update_layout(
    title_text="Dynamics of Airdrop and Liquidation Gain"
)
fig.update_xaxes(tick0=0, dtick=1, title_text="Month")
fig.update_yaxes(title_text="Airdrop Gain", secondary_y=False)
fig.update_yaxes(title_text="Liquidation Gain", secondary_y=True)
fig.show()

fig = make_subplots(rows=2, cols=1)
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['issuance_fee'], name="Issuance Fee"),
    row=1, col=1
)
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['redemption_fee'], name="Redemption Fee"),
    row=2, col=1
)
fig.add_trace(
    go.Scatter(x=data2.index/720, y=data2['issuance_fee'], name="Issuance Fee New", line = dict(dash='dot')),
    row=1, col=1
)
fig.add_trace(
    go.Scatter(x=data2.index/720, y=data2['redemption_fee'], name="Redemption Fee New", line = dict(dash='dot')),
    row=2, col=1
)
fig.update_layout(
    title_text="Dynamics of Issuance Fee and Redemption Fee"
)
fig.update_xaxes(tick0=0, dtick=1, title_text="Month")
fig.update_yaxes(title_text="Issuance Fee", secondary_y=False, row=1, col=1)
fig.update_yaxes(title_text="Redemption Fee", secondary_y=False, row=2, col=1)
fig.show()

fig = make_subplots(specs=[[{"secondary_y": True}]])
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['annualized_earning'], name="Annualized Earning"),
    secondary_y=False,
)
fig.add_trace(
    go.Scatter(x=data2.index/720, y=data2['annualized_earning'], name="Annualized Earning New", line = dict(dash='dot')),
    secondary_y=False,
)
fig.update_layout(
    title_text="Dynamics of Annualized Earning"
)
fig.update_xaxes(tick0=0, dtick=1, title_text="Month")
fig.update_yaxes(title_text="Annualized Earning", secondary_y=False)
fig.show()

fig = make_subplots(specs=[[{"secondary_y": True}]])
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['price_POLLEN'], name="POLLEN Price"),
    secondary_y=False,
)
fig.add_trace(
    go.Scatter(x=data.index/720, y=data['MC_POLLEN'], name="POLLEN Market Cap"),
    secondary_y=True,
)
fig.add_trace(
    go.Scatter(x=data2.index/720, y=data2['price_POLLEN'], name="POLLEN Price New", line = dict(dash='dot')),
    secondary_y=False,
)
fig.add_trace(
    go.Scatter(x=data2.index/720, y=data2['MC_POLLEN'], name="POLLEN Market Cap New", line = dict(dash='dot')),
    secondary_y=True,
)
fig.update_layout(
    title_text="Dynamics of the Price and Market Cap of POLLEN"
)
fig.update_xaxes(tick0=0, dtick=1, title_text="Month")
fig.update_yaxes(title_text="POLLEN Price", secondary_y=False)
fig.update_yaxes(title_text="POLLEN Market Cap", secondary_y=True)
fig.show()

fig = make_subplots(specs=[[{"secondary_y": True}]])
fig.add_trace(
    go.Scatter(x=data.index/720, y=[0.01] * n_sim, name="Base Rate"),
    secondary_y=False,
)
fig.add_trace(
    go.Scatter(x=data2.index/720, y=data2['base_rate'], name="Base Rate New"),
    secondary_y=False,
)
fig.update_layout(
    title_text="Dynamics of Issuance Fee and Redemption Fee"
)
fig.update_xaxes(tick0=0, dtick=1, title_text="Month")
fig.update_yaxes(title_text="Issuance Fee", secondary_y=False)
fig.update_yaxes(title_text="Redemption Fee", secondary_y=True)
fig.show()

def trove2_histogram(measure):
  fig = px.histogram(troves2, x=measure, title='Distribution of '+measure, nbins=25)
  fig.show()

trove2_histogram('iBGT_Quantity')
trove2_histogram('CR_initial')
trove2_histogram('Supply')
trove2_histogram('Rational_inattention')
trove2_histogram('CR_current')