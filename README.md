# Insight Trends

[![current version](https://img.shields.io/badge/version-3.0.0-<COLOR>.svg)](https://shields.io/)

Homey features powerful insights that allow you to see all sensor measurements and it's development in the past. Get one step further and not only see the insights put also act accordingly or even see a little bit into the future!

The app provides a bunch of action- and condition flow cards where you select an insight (a device and a capability, i.e. temperature outside) and a scope to analyse (i.e. the last 15 minutes). The following results will then be calculated:
 - Trend: a value between -1 and 1 indicating if the sensors measurement is going up or down (and how fast/slow). for example a value of 0.75 means the trend is going up rapidly while -0.1 means a slight downwards trend
 - Min/max: the minimal/maximal value discovered within the scope
 - Average: the average of all values in the scope (arithmetic mean)
 - Median: if all values would get sorted and if you take the value in the middle this is the median
 - Standard deviation: indicator active/inactive the measured value or how 'spreaded' the data set is
 - Dataset size: how many measurements the scope has. This can be useful to determine how trustworthy the results above are. For example if you have a sensor that only reports every 30 minutes and your scope is one hour you will get some results but they are based on just two measurements so the trend is maybe not that accurate. Important: a bigger scope might not have a bigger dataset than a smaller one as the accuracy (and therefore the sample points) also get is reduced.

 Additionally there are separate cards for percentile calculations where you can provide a % value. Example: You have a flower sensor that measures the lux values and you want to check if the plant had at least 6 hours with a lux value of 2000 per day. You could now check the percentile value with the parameter 25% (6 out of 24 hours) in a scope of the last 24h. This value then should be >= 2000.

 More example usage scenarios:
  - If you have an humidity sensor and you want an alarm to go off if the humidity is too high. When you take a shower it might be that the alarm goes on because you have a very high humidity for a short amount of time which is okay. Before you trigger the alarm you now might check the average humidity over the past 4 hours and only trigger the alarm if also this value is high.
  - Long term analysis: you could analyse if for example the temperature is going up or down over a longer period of time and accordingly take measurements early (heating/cooling). Because you are considering a longer period of time this basically excludes short term events such as a rainy weekend during the summer.
  - You not only get the current measurements but you also get insights how it came to the current measurement. If you're monitoring the temperature for example you would see from the trend if the temperature raised/dropped rather fast or slowly which can indicate different reasons, i.e. an open window versus a minor problem with your heating system.
  - Less complex flow scenarios: for some reason you might need to now if the temperature went bellow zero in the last night. Instead of having to listen to all events and store the lowest temperature and resetting this variable you might just use the insights to check this at any time for any scope.
  - Act early: instead of triggering an alarm when it is already too late you might analyse the trends and give a warning early. For example you might want to prevent mold by monitoring humidity and temperature. Depending of the current values and also it's trends you then can detect this risk early!
  - Detect if some behaviour starts to change: for example if you have a vibration sensor on your washing machine you could see if something is wrong if the standard deviation increases over time.
