getwd()


setwd("C:/Users/vishrti/Desktop/ML webinar")


library(openxlsx)


dhcb<-read.xlsx("DCHB_Village_Release_0600 v1.xlsx")

str(dhcb)

colnames(dhcb)

dhcb_education<-dhcb[,2:30]

colnames(dhcb_education)

#inversing the distance columns

dhcb_education$Distance<-15- dhcb_education$Distance
dhcb_education$Distance.1<-15- dhcb_education$Distance.1
dhcb_education$Distance.2<-15- dhcb_education$Distance.2
dhcb_education$Distance.3<-15- dhcb_education$Distance.3
dhcb_education$Distance.4<-15- dhcb_education$Distance.4
dhcb_education$Distance.5<-15- dhcb_education$Distance.5
dhcb_education$Distance.6<-15- dhcb_education$Distance.6
dhcb_education$Distance.7<-15- dhcb_education$Distance.7
dhcb_education$Distance.8<-15- dhcb_education$Distance.8
dhcb_education$Distance.9<-15- dhcb_education$Distance.9

dhcb_education$Distance10<-15- dhcb_education$`(If.not.available.within.the.village,.the.distance.range.code.of.nearest.place.where.facility.is.available.is.given.viz;.a.for.<.5.Kms,.b.for.5-10.Kms.and.c.for.10+.kms.).`

dhcb_education$

dhcb_education$`(If.not.available.within.the.village,.the.distance.range.code.of.nearest.place.where.facility.is.available.is.given.viz;.a.for.<.5.Kms,.b.for.5-10.Kms.and.c.for.10+.kms.).` = NULL


colnames(dhcb_education)


colnames(dhcb_education[,27])


dhcb_education<-dhcb_education[,-27]

colnames(dhcb_education)


dhcb_education_small<-dhcb_education[dhcb_education$Total.Population.of.Village<1000,]

dhcb_education_medium<-dhcb_education[dhcb_education$Total.Population.of.Village > 1000 & dhcb_education$Total.Male.Population.of.Village < 2500 ,]

dhcb_education_high<-dhcb_education[dhcb_education$Total.Population.of.Village>2500,]

head (dhcb_education$Distance)


dhcb_education_high[dhcb_education_high$Total.Population.of.Village<2500,]

dhcb_education_medium[dhcb_education_medium$Total.Population.of.Village > 2500,]


library(dplyr)

dhcb_education_medium1<-filter(dhcb_education_medium, Total.Population.of.Village >= 1000 & Total.Population.of.Village <= 2500)



dim(dhcb_education)
dim(dhcb_education_high)+
dim(dhcb_education_medium1)+
dim(dhcb_education_small)


dhcb_education_small.Scaled <- scale(dhcb_education_small[,3:29])


head(dhcb_education_small.Scaled)

str(dhcb_education_small.Scaled)




lapply()


dhcb_education_small.Scaled1<-dhcb_education_small.Scaled[,-c(24,25)]

wssplot <- function(data, nc=15, seed=3110){
  wss <- (nrow(data)-1)*sum(apply(data,2,var))
  for (i in 2:nc){
    set.seed(seed)
    wss[i] <- sum(kmeans(data, centers=i)$withinss)}
  plot(1:nc, wss, type="b", xlab="Number of Clusters",
       ylab="Within groups sum of squares")}

wssplot(dhcb_education_small.Scaled1, nc=5)


colnames(dhcb_education_small.Scaled)

colnames(dhcb_education_small.Scaled)

sum(is.na(dhcb_education_small.Scaled1))







colnames(dhcb_education_small.Scaled1)


colnames(dhcb_education_small)

sum(is.na(dhcb_education_small.Scaled$))

dhcb_education_small.Scaled$


distance.enggcol<-dist(enggcol1[,3:7],method="minkowski",p=2)
print(distance.enggcol,digit=3)

colnames(dhcb_education_small.Scaled1)

sum(is.na(dhcb_education_small.Scaled1))

library(NbClust)

nc <- NbClust(na.omit(dhcb_education_small.Scaled1[,1:25]), min.nc=2, max.nc=5, method="kmeans")
table(nc$Best.n[1,])

barplot(table(nc$Best.n[1,]),
        xlab="Numer of Clusters", ylab="Number of Criteria",
        main="Number of Clusters Chosen by 26 Criteria")


kmeans.clus = kmeans(x=dhcb_education_small.Scaled1, centers = 4, nstart = 3)

dhcb_education_small$Clusters <- kmeans.clus$cluster

colnames(dhcb_education_small)

KcustSpendData$Clusters <- kmeans.clus$cluster
View(KcustSpendData)
aggr = aggregate(dhcb_education_small[,-c(1,2,26,27)],list(dhcb_education_small$Clusters),mean)



write.csv(dhcb_education_small,file="dhcb_education_small.csv")

write.csv(aggr,file="dhcb_education_small1.csv")

getwd()


 