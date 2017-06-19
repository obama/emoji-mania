"""
download file: http://unicode.org/Public/emoji/5.0/emoji-test.txt or the according newer version
"""

import codecs, json, itertools

emojidata = {
    'groups': [],
    'subgroups': [], # list of lists
    'groupIcons': [], # icon for each group. its the first emoji of each group. save it here to save searching it later order is the same as groups
    'emojis': {} # key = utf8, val = list, where 1st item = name, following = annotations
}

# load annottations from different file
f = codecs.open('annotations_en.xml', 'r', encoding='utf_8')
annotations = {}
for l in f:
    l = l.strip()
    if (l[0:16] == '<annotation cp="'):
        cp = l.split('"')[1]
        tags = ' '.join([x.strip() for x in l.split('>')[1].split('<')[0].split('|')]).split(' ') # also make "tag like this" to ['tag', 'like', 'this']
        #print(cp, tags)
        if (cp in annotations):
            annotations[cp].extend(tags)
        else:
            annotations[cp] = tags
		#annotations[cp] = tags
#print(annotations)
f.close()

f = codecs.open('emoji-test.txt', 'r', encoding='utf_8')

# while walking over the file, we have to know the current group and subgroup
group    = ''
subgroup = ''

for l in f:
    #print(l)
    l = l.strip()
    if (l.strip() == ''):
        continue

    if (l[0:7] == "# group"):
        group = l[9:].strip()
        if (group not in emojidata['groups']):
            emojidata['groups'].append(group)
    if (group != ''):
        if (l[0:10] == "# subgroup"):
            subgroup = l[11:].strip()
            groupIndex = emojidata['groups'].index(group)
            if (len(emojidata['subgroups']) <= groupIndex):
                emojidata['subgroups'].append([])
            #print(emojidata)
            if (subgroup not in emojidata['subgroups'][groupIndex]):
                emojidata['subgroups'][groupIndex].append(subgroup)
        elif (subgroup != ''):
            if (l[0] != '#'): # ignore additional lines that tell count of emonjis etc
                groupIndex = emojidata['groups'].index(group)
                subIndex   = emojidata['subgroups'][groupIndex].index(subgroup)
                s = l.split(';')
                #print(l)
                if (l.split(';')[1].strip().split(' ')[0] == 'fully-qualified'):
                    key = ''.join([chr(int(x, 16)) for x in s[0].strip().split(' ')])
                    name = s[1].split('#')[1].split(' ')[2:] # tokenized name
                    if (key in annotations):
                        annotations[key] = [x for x in annotations[key] if x not in name]
                        if (len(annotations[key]) == 0): # if annotations only contained words in the name, remove the annotation
                            del annotations[key]
                    #print(name)
                    #if (key in annotations):
                    #    print(annotations[key])
                    emojidata['emojis'][key] = { 'name': [' '.join(name)] + (annotations[key] if key in annotations else []), 'group': [groupIndex, subIndex] }
                    if (len(emojidata['groupIcons']) <= groupIndex):
                        emojidata['groupIcons'].append(key)
#print(emojidata)
f.close()


fp = open('emoji.json', 'w')
print(json.dump(emojidata, fp, indent=4))
fp.close()
