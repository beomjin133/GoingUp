import os

module_list = ['pyupbit', 'slacker', 'pybithumb']

for module in module_list:
    os.system('sudo pip3 install ' + str(module))
    os.system('pip3 install ' + str(module))